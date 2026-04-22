# views.py (final, fully corrected)
from rest_framework import status, permissions, serializers, viewsets, generics,permissions
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, parser_classes, permission_classes, action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User as AuthUser
from django.utils import timezone
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import connections, models
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from django.conf import settings

from .models import (
    Company, Dealer, Employee, LoginRecord,
    MachineInstallation, InstallationPhoto, Task, AccountMaster, ticket, TicketCategory, Department,
    DealerStockAudit, DealerStockMaster, DealerStockSyncLog, DealerStockReturn,PurchaseOrder, PurchaseOrderConfirmation, ItemMaster
)
from .serializers import (
    CompanySerializer, DealerSerializer, EmployeeSerializer, TicketSerializer,
    TicketCategorySerializer, DepartmentSerializer, DealerStockMasterSerializer,
    DealerStockAuditSerializer, MachineInstallationSerializer, TaskSerializer,
    AccountMasterSerializer, UserRoleSerializer, PurchaseOrderSerializer, PurchaseOrderCreateSerializer,
    PurchaseOrderConfirmationSerializer, ItemMasterSerializer
)
from .utils import generate_otp, send_otp_email
from api.permissions import IsDealerUser, IsCompanyUser, IsSystemAdmin

# -------------------------------------------------------------------
# Helper – create dummy auth_user for DRF Token
# -------------------------------------------------------------------
def get_or_create_auth_user(email: str) -> AuthUser:
    user, _ = AuthUser.objects.get_or_create(
        username=email.lower(),
        defaults={
            "email": email.lower(),
            "password": make_password("Comptech@123"),
            "is_active": True,
        },
    )
    return user


# -------------------------------------------------------------------
# Company Registration & List
# -------------------------------------------------------------------
class RegisterCompany(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        if Company.objects.filter(email=email).exists():
            return Response({"message": "A company with this e-mail already exists."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = CompanySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        msg = "Company registered."
        try:
            send_mail(
                subject="Welcome to Comptech!",
                message=f"Dear {company.name},\n\nWelcome aboard!",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[company.email],
                fail_silently=False,
            )
            msg += " Welcome e-mail sent."
        except Exception as exc:
            print(f"Error sending email to {company.email}: {exc}")
            return Response({"message": msg, "error": str(exc), "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"message": msg, "data": serializer.data}, status=status.HTTP_201_CREATED)

class CompanyListView(generics.ListAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [AllowAny]


# -------------------------------------------------------------------
# Dealer CRUD
# -------------------------------------------------------------------
class DealerListView(generics.ListCreateAPIView):
    queryset = Dealer.objects.all()
    serializer_class = DealerSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        email = serializer.validated_data["email"]
        is_direct = self.request.data.get("isDirect", False)
        if not is_direct and not cache.get(f"verified_otp_{email}"):
            raise serializers.ValidationError("Please verify OTP first.")
        dealer = serializer.save()
        if not is_direct:
            cache.delete(f"verified_otp_{email}")
        try:
            send_mail(
                subject="Welcome as a Dealer to Comptech!",
                message=f"Dear {dealer.name},\n\nWelcome aboard!",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[dealer.email],
                fail_silently=False,
            )
        except Exception as exc:
            print(f"Error sending dealer welcome email to {dealer.email}: {exc}")

class DealerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Dealer.objects.all()
    serializer_class = DealerSerializer
    permission_classes = [IsAuthenticated]


# -------------------------------------------------------------------
# OTP Views
# -------------------------------------------------------------------
class SendOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"message": "E-mail required."}, status=status.HTTP_400_BAD_REQUEST)
        otp = generate_otp()
        send_otp_email(email, otp)
        cache.set(f"otp_{email}", otp, timeout=300)
        return Response({"message": f"OTP sent to {email}."})

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        otp_input = request.data.get("otp")
        real_otp = cache.get(f"otp_{email}")
        if not (email and otp_input):
            return Response({"message": "E-mail & OTP required."}, status=status.HTTP_400_BAD_REQUEST)
        if not real_otp:
            return Response({"message": "OTP expired / not found."}, status=status.HTTP_400_BAD_REQUEST)
        if otp_input != real_otp:
            return Response({"message": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
        cache.set(f"verified_otp_{email}", True, timeout=600)
        cache.delete(f"otp_{email}")
        return Response({"message": "OTP verified."})


# -------------------------------------------------------------------
# Unified Login (Employee → Dealer → Company)
# -------------------------------------------------------------------
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def _issue_token(self, email: str) -> str:
        token, _ = Token.objects.get_or_create(user=get_or_create_auth_user(email))
        return token.key

    def post(self, request):
        email = (request.data.get("email") or "").lower().strip()
        password = request.data.get("password") or ""

        # Employee
        emp = Employee.objects.filter(email=email).first()
        if emp:
            if check_password(password, emp.password):
                if emp.company:
                    company_name = emp.company.name
                elif emp.dealer and emp.dealer.company:
                    company_name = emp.dealer.company.name
                else:
                    company_name = None

                LoginRecord.objects.create(email=email, user_type="employee", success=True)
                return Response({
                    "message": "Login successful",
                    "token": self._issue_token(email),
                    "user_type": "employee",
                    "employee_id": emp.id,
                    "name": emp.name,
                    "role": emp.role,
                    "company_id": emp.company_id,
                    "dealer_id": emp.dealer_id,
                    "company_name": company_name,
                }, status=status.HTTP_200_OK)
            LoginRecord.objects.create(email=email, user_type="employee", success=False)
            return Response({"message": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED)

        # Dealer
        dealer = Dealer.objects.filter(email=email).first()
        if dealer:
            if check_password(password, dealer.password):
                company_name = dealer.company.name if dealer.company else None
                LoginRecord.objects.create(email=email, user_type="dealer", success=True)
                return Response({
                    "message": "Login successful",
                    "token": self._issue_token(email),
                    "user_type": "dealer",
                    "dealer_id": dealer.id,
                    "company_id": dealer.company_id,
                    "name": dealer.name,
                    "role": "DEALER_ADMIN",
                    "company_name": company_name,
                }, status=status.HTTP_200_OK)
            LoginRecord.objects.create(email=email, user_type="dealer", success=False)
            return Response({"message": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED)

        # Company
        company = Company.objects.filter(email=email).first()
        if company:
            if check_password(password, company.password):
                LoginRecord.objects.create(email=email, user_type="company", success=True)
                return Response({
                    "message": "Login successful",
                    "token": self._issue_token(email),
                    "user_type": "company",
                    "company_id": company.id,
                    "name": company.name,
                    "role": "COMPANY_ADMIN",
                    "company_name": company.name,
                }, status=status.HTTP_200_OK)
            LoginRecord.objects.create(email=email, user_type="company", success=False)
            return Response({"message": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)


# -------------------------------------------------------------------
# Employee CRUD
# -------------------------------------------------------------------
class RegisterEmployee(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        employee_qs = Employee.objects.all()
        current_employee = Employee.objects.filter(email=user.email).first()
        if current_employee:
            if current_employee.role == 'APPLICATION_ADMIN':
                pass
            elif current_employee.role in ['COMPANY_ADMIN', 'COMPANY_EMPLOYEE']:
                employee_qs = employee_qs.filter(company_id=current_employee.company_id)
            elif current_employee.role in ['DEALER_ADMIN', 'DEALER_EMPLOYEE']:
                employee_qs = employee_qs.filter(dealer_id=current_employee.dealer_id)
            else:
                return Response({"message": "Unauthorized role."}, status=status.HTTP_403_FORBIDDEN)
        else:
            company_user = Company.objects.filter(email=user.email).first()
            dealer_user = Dealer.objects.filter(email=user.email).first()
            if company_user:
                employee_qs = employee_qs.filter(company=company_user)
            elif dealer_user:
                employee_qs = employee_qs.filter(dealer=dealer_user)
            else:
                return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        return Response(EmployeeSerializer(employee_qs, many=True).data)

    def post(self, request):
        email = request.data.get("email")
        if Employee.objects.filter(email=email).exists():
            return Response({"message": "Employee already exists."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = EmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emp = serializer.save()
        return Response({"message": "Employee registered.", **EmployeeSerializer(emp).data}, status=status.HTTP_201_CREATED)

class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]


# -------------------------------------------------------------------
# Dealer Count Helper
# -------------------------------------------------------------------
class DealerCountView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    def get(self, request):
        company_id = request.query_params.get("company_id")
        count = Dealer.objects.filter(company_id=company_id).count() if company_id else Dealer.objects.count()
        return Response({"dealer_count": count})


# -------------------------------------------------------------------
# Machine Installation Views
# -------------------------------------------------------------------
class MachineInstallationListView(generics.ListAPIView):
    serializer_class = MachineInstallationSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MachineInstallation.objects.all().order_by("-created_at")
        company_id = self.request.query_params.get("company_id")
        dealer_id = self.request.query_params.get("dealer_id")
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        if employee:
            if employee.role == "APPLICATION_ADMIN":
                pass
            elif employee.role in ["COMPANY_ADMIN", "COMPANY_EMPLOYEE"]:
                qs = qs.filter(company=employee.company)
            elif employee.role in ["DEALER_ADMIN", "DEALER_EMPLOYEE"]:
                qs = qs.filter(dealer=employee.dealer)
            else:
                return MachineInstallation.objects.none()
        elif Dealer.objects.filter(email=user.email).exists():
            dealer = Dealer.objects.get(email=user.email)
            qs = qs.filter(dealer=dealer)
        elif Company.objects.filter(email=user.email).exists():
            company = Company.objects.get(email=user.email)
            qs = qs.filter(company=company)
        else:
            return MachineInstallation.objects.none()
        if company_id:
            qs = qs.filter(company_id=company_id)
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        return qs

class MachineInstallationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MachineInstallation.objects.all()
    serializer_class = MachineInstallationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def create_machine_installation(request):
    data = request.data.copy()  # make mutable copy

    user = request.user
    email = user.email

    # Determine if the user is a dealer (not an employee)
    is_dealer = False
    dealer_obj = None

    emp = Employee.objects.filter(email=email).first()
    if emp:
        # User is an employee – keep submitted_by as is
        pass
    else:
        dealer_obj = Dealer.objects.filter(email=email).first()
        if dealer_obj:
            is_dealer = True
            # For dealer users, set submitted_by to None and provide dummy name/role
            # The backend model must allow null for submitted_by
            data['submitted_by'] = None
            data['submitted_by_name'] = dealer_obj.name
            data['submitted_by_role'] = 'DEALER_ADMIN'

    serializer = MachineInstallationSerializer(data=data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# -------------------------------------------------------------------
# Task Management
# -------------------------------------------------------------------
class IsAppAdminOrCompanyAdminForWrite(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False

        try:
            employee = Employee.objects.get(email=request.user.email)
            if employee.role in ['APPLICATION_ADMIN', 'COMPANY_ADMIN']:
                return True
        except Employee.DoesNotExist:
            pass

        try:
            company = Company.objects.get(email=request.user.email)
            return True
        except Company.DoesNotExist:
            pass

        return False

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsAppAdminOrCompanyAdminForWrite]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()
        user_email = user.email
        employee = Employee.objects.filter(email=user_email).first()
        if employee:
            if employee.role == "APPLICATION_ADMIN":
                return Task.objects.all()
            elif employee.role == "COMPANY_ADMIN":
                return Task.objects.filter(
                    Q(assigner=employee.company) |
                    Q(assignee__company=employee.company)
                ).distinct()
            elif employee.role == "COMPANY_EMPLOYEE":
                return Task.objects.filter(assignee=employee)
            return Task.objects.none()
        company = Company.objects.filter(email=user_email).first()
        if company:
            return Task.objects.filter(assigner=company)
        return Task.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        company = None

        if employee:
            company = employee.company
        else:
            company = Company.objects.filter(email=user.email).first()

        if company is None:
            serializer.save()
        else:
            serializer.save(
                assigner=company,
                assignee=serializer.validated_data.get("assignee")
            )

class EmployeeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmployeeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if not user.is_authenticated:
            return Employee.objects.none()

        employee = Employee.objects.filter(email=user.email).first()
        if employee and employee.role == "APPLICATION_ADMIN":
            return Employee.objects.filter(role="COMPANY_EMPLOYEE")

        company = Company.objects.filter(email=user.email).first()
        if company:
            return Employee.objects.filter(company=company, role="COMPANY_EMPLOYEE")

        if employee and employee.role == "COMPANY_ADMIN":
            return Employee.objects.filter(company=employee.company, role="COMPANY_EMPLOYEE")

        return Employee.objects.none()


# -------------------------------------------------------------------
# Utility endpoints
# -------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def check_serial_unique(request):
    serial = request.query_params.get("serial", "").strip()
    exists = MachineInstallation.objects.filter(serial_number__iexact=serial).exists()
    return Response({"isUnique": not exists})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_batch_unique(request):
    batch = request.query_params.get("batch", "").strip()
    if not batch:
        return Response({"error": "Batch number is required."}, status=status.HTTP_400_BAD_REQUEST)
    exists = MachineInstallation.objects.filter(batch_number__iexact=batch).exists()
    return Response({"isUnique": not exists})

class GetDealerDataByBatch(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        batch_no = request.query_params.get("batch", "").strip()
        if not batch_no:
            return Response({"error": "Batch number is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        role = None
        user_gst = None
        current_employee = Employee.objects.filter(email=getattr(user, 'email', None)).first()
        if current_employee:
            role = current_employee.role.lower()
            if current_employee.dealer:
                user_gst = current_employee.dealer.gst_no
            elif current_employee.company:
                user_gst = current_employee.company.gst_no
        else:
            dealer_user = Dealer.objects.filter(email=getattr(user, 'email', None)).first()
            if dealer_user:
                role = 'dealer_admin'
                user_gst = dealer_user.gst_no
            else:
                company_user = Company.objects.filter(email=getattr(user, 'email', None)).first()
                if company_user:
                    role = 'company_admin'
                    user_gst = company_user.gst_no
                else:
                    return Response({"error": "Unable to determine user role or associated entity."}, status=status.HTTP_403_FORBIDDEN)
        try:
            with connections['munim006_db'].cursor() as cursor:
                query = """
                    SELECT
                        itm.itemcode as item_code,
                        itm.ItemName AS item_name,
                        sibd.BatchNo AS batch_number,
                        a.DocumentNo AS invoice_number,
                        a.DocumentDate AS purchase_date,
                        am.AccountName AS party_name,
                        am.GSTNo AS gst_no
                    FROM SalesInvoice AS a
                    LEFT JOIN SalesInvoiceDetails AS b ON a.SalesInvoiceId = b.SalesInvoiceId
                    LEFT JOIN ItemMaster AS itm ON itm.ItemMasterId = b.ItemMasterId
                    LEFT JOIN SalesInvoiceBatchDetails AS sibd ON sibd.SalesInvoiceDetailsId = b.SalesInvoiceDetailsId
                    LEFT JOIN AccountMaster AS am ON am.AccountMasterId = a.PartyAccountMasterId
                    where 
                    itm.ItemGroupMasterId in (2,3,5,8,10,11,12,13,14,16,29,20077,40103,40105,40107) 
                    and  sibd.BatchNo = %s
                """
                cursor.execute(query, [batch_no])
                row = cursor.fetchone()
            if not row:
                return Response({"error": "Machine not found for this batch number in the external database."}, status=status.HTTP_404_NOT_FOUND)
            item_code, item_name, batch_number, invoice_number, purchase_date, party_name, party_gst = row
            if role in ['dealer_admin', 'dealer_employee']:
                if not user_gst:
                    return Response({"error": "Your GST number is missing in your profile. Please update your profile or contact support."}, status=status.HTTP_400_BAD_REQUEST)
                if user_gst.strip().upper() != (party_gst or '').strip().upper():
                    return Response({"error": "You are not authorized to view this item's details. GST mismatch."}, status=status.HTTP_403_FORBIDDEN)
            return Response({
                "item_name": item_name,
                "item_code": item_code,
                "batch_number": batch_number,
                "invoice_number": invoice_number,
                "purchase_date": purchase_date,
                "party_name": party_name,
                "gst_no": party_gst,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ERROR] Machine fetch failed from munim006_db: {e}")
            return Response({"error": f"Internal server error while fetching external data: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_machine_details_by_batch(request):
    batch_number = request.GET.get('batch', '').strip()
    if not batch_number:
        return Response({"error": "Batch number is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        machine = MachineInstallation.objects.get(batch_number=batch_number)
        serializer = MachineInstallationSerializer(machine)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except MachineInstallation.DoesNotExist:
        return Response({"error": "Machine with this batch number does not exist in the internal database."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"[ERROR] Internal machine fetch failed: {e}")
        return Response({"error": f"Internal server error while fetching machine details: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetPartyDetailsByGST(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        gst_no = request.query_params.get('gst_no', None)
        if not gst_no:
            return Response({"error": "GST number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_data = AccountMaster.objects.using('munim006_db').get(gstno=gst_no)
            serializer = AccountMasterSerializer(account_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except AccountMaster.DoesNotExist:
            return Response({"error": "No data found for this GST number in the external database."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error fetching party details by GST from munim006_db: {e}")
            return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserRoleViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        all_users = list(Employee.objects.all()) + list(Dealer.objects.all()) + list(Company.objects.all())
        serializer = UserRoleSerializer(all_users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TicketCategoryViewSet(viewsets.ModelViewSet):
    queryset = TicketCategory.objects.all().order_by('name')
    serializer_class = TicketCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class TicketViewSet(viewsets.ModelViewSet):
    queryset = ticket.objects.all().select_related(
        'category', 'machine_installation',
        'created_by_content_type', 'assigned_to_content_type',
    ).order_by('-created_at')

    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        email = user.email

        obj = None
        user_role = None
        user_gst = None

        if Employee.objects.filter(email=email).exists():
            obj = Employee.objects.get(email=email)
            user_role = obj.role
            if user_role == "DEALER_EMPLOYEE" and obj.dealer:
                user_gst = obj.dealer.gst_no

        elif Dealer.objects.filter(email=email).exists():
            obj = Dealer.objects.get(email=email)
            user_role = "DEALER_ADMIN"
            user_gst = obj.gst_no

        elif Company.objects.filter(email=email).exists():
            obj = Company.objects.get(email=email)
            user_role = "COMPANY_ADMIN"

        if user_role in ["DEALER_ADMIN", "DEALER_EMPLOYEE"]:
            machine = serializer.validated_data.get("machine_installation")
            if machine:
                machine_gst = getattr(machine, "gst_no", None)
                if not machine_gst:
                    raise serializers.ValidationError({"gst": "Machine GST not found."})
                if not user_gst:
                    raise serializers.ValidationError({"gst": "Your GST number is not available."})
                if user_gst.strip().upper() != machine_gst.strip().upper():
                    raise serializers.ValidationError({"gst": "GST mismatch. You are not allowed to create this ticket."})

        if obj:
            serializer.save(
                created_by_content_type=ContentType.objects.get_for_model(obj),
                created_by_object_id=obj.pk
            )
        else:
            serializer.save()

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.is_superuser:
            return qs

        email = user.email

        if Employee.objects.filter(email=email).exists():
            emp = Employee.objects.get(email=email)
            return qs.filter(assigned_to_object_id=emp.pk)

        elif Dealer.objects.filter(email=email).exists():
            dealer = Dealer.objects.get(email=email)
            return qs.filter(created_by_object_id=dealer.pk)

        elif Company.objects.filter(email=email).exists():
            company = Company.objects.get(email=email)
            return qs.filter(created_by_object_id=company.pk)

        return qs.none()


@api_view(["GET"])
def get_departments(request):
    departments = Department.objects.filter(is_active=True)
    serializer = DepartmentSerializer(departments, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_tickets(request):
    employee = request.user.employee
    if not employee.Department or employee.Department.department_name != "Service":
        return Response(
            {"error": "You are not allowed to access tickets."},
            status=status.HTTP_403_FORBIDDEN
        )
    tickets = ticket.objects.all()
    serializer = TicketSerializer(tickets, many=True)
    return Response(serializer.data)


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connections
from .models import Company, Dealer, Employee, MachineInstallation


class GetMachineDetails(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        batch = request.query_params.get('batch', '').strip()
        vin = request.query_params.get('vin', '').strip().upper()
        user = request.user
        email = user.email

        company = None
        if Employee.objects.filter(email=email).exists():
            emp = Employee.objects.get(email=email)
            company = emp.company or (emp.dealer.company if emp.dealer else None)

        elif Dealer.objects.filter(email=email).exists():
            dealer = Dealer.objects.get(email=email)
            company = dealer.company

        elif Company.objects.filter(email=email).exists():
            company = Company.objects.get(email=email)

        if not company:
            return Response({"error": "Company not found for user."}, status=403)

        company_name = company.name.lower()

        if "comptech equipments limited" in company_name:
            if not batch:
                return Response({"error": "Batch number required."}, status=400)
            return self._fetch_equipment(batch, company)

        elif "comptech motocorp private limited" in company_name:
            if not vin:
                return Response({"error": "VIN number required."}, status=400)
            return self._fetch_motocorp(vin, company)

        else:
            if batch:
                return self._fetch_equipment(batch, company)
            elif vin:
                return self._fetch_motocorp(vin, company)

            return Response({"error": "Provide batch or VIN."}, status=400)

    def _fetch_equipment(self, batch, company):
        try:
            with connections['munim006_db'].cursor() as cursor:
                query = """
                    SELECT
                        itm.ItemCode,
                        b.Remarks,
                        itm.ItemName,
                        sibd.BatchNo,
                        a.DocumentNo,
                        a.DocumentDate,
                        am.AccountName,
                        am.GSTNo
                    FROM SalesInvoice a
                    LEFT JOIN SalesInvoiceDetails b ON a.SalesInvoiceId = b.SalesInvoiceId
                    LEFT JOIN ItemMaster itm ON itm.ItemMasterId = b.ItemMasterId
                    LEFT JOIN SalesInvoiceBatchDetails sibd ON sibd.SalesInvoiceDetailsId = b.SalesInvoiceDetailsId
                    LEFT JOIN AccountMaster am ON am.AccountMasterId = a.PartyAccountMasterId
                    WHERE itm.ItemGroupMasterId IN (2,3,5,8,10,11,12,13,14,16,29,20077,40103,40105,40107)
                      AND sibd.BatchNo = %s
                """
                cursor.execute(query, [batch])
                row = cursor.fetchone()

            if not row:
                return Response({"error": "Batch not found."}, status=404)

            item_code, remarks, item_name, batch_no, invoice_no, invoice_date, party_name, gst_no = row

            return Response({
                "item_code": item_code,
                "remarks": remarks,
                "item_name": item_name,
                "batch_number": batch_no,
                "invoice_number": invoice_no,
                "purchase_date": invoice_date,
                "party_name": party_name,
                "gst_no": gst_no,
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def _fetch_motocorp(self, vin, company):
        try:
            with connections['munim010_db'].cursor() as cursor:

                query = """
                SELECT * FROM (

                    -- QUERY 1
                    SELECT
                        itm.ItemCode,
                        itm.ItemName,
                        si.DocumentNo,
                        si.DocumentDate,
                        am.AccountName,
                        am.GSTNo,
                        COALESCE(
                            NULLIF(NULLIF(udf.UDF_VinNo_2116,'0'),''),
                            NULLIF(NULLIF(udf.UDF_Vinnumber_2116,'0'),'')
                        ) AS VinNo

                    FROM SalesInvoiceBatchDetails sibd
                    INNER JOIN SalesInvoiceDetails sid ON sid.SalesInvoiceDetailsId = sibd.SalesInvoiceDetailsId
                    INNER JOIN SalesInvoice si ON si.SalesInvoiceId = sid.SalesInvoiceId
                    INNER JOIN ItemMaster itm ON itm.ItemMasterId = sid.ItemMasterId
                    INNER JOIN AccountMaster am ON am.AccountMasterId = si.PartyAccountMasterId
                    LEFT JOIN DispatchDetails disd ON disd.DispatchDetailsId = sid.ReferenceId
                    LEFT JOIN DispatchBatchDetails disb ON disb.DispatchDetailsId = disd.DispatchDetailsId AND disb.BatchNo = sibd.BatchNo
                    LEFT JOIN DispatchBatchDetailsUDF udf ON udf.DispatchBatchDetailsId = disb.DispatchBatchDetailsId

                    WHERE itm.ItemGroupMasterId IN (110110,110108,110107,110102,110103,110115)

                    UNION

                    -- QUERY 2
                    SELECT
                        itm.ItemCode,
                        itm.ItemName,
                        si.DocumentNo,
                        si.DocumentDate,
                        am.AccountName,
                        am.GSTNo,
                        COALESCE(
                            NULLIF(NULLIF(udf.UDF_VinNo_2116,'0'),''),
                            NULLIF(NULLIF(udf.UDF_Vinnumber_2116,'0'),'')
                        ) AS VinNo

                    FROM DispatchBatchDetails disb
                    INNER JOIN DispatchDetails disd ON disd.DispatchDetailsId = disb.DispatchDetailsId
                    INNER JOIN Dispatch dis ON dis.DispatchId = disd.DispatchId
                    LEFT JOIN SalesInvoiceDetails sid ON sid.ReferenceId = disd.DispatchDetailsId
                    LEFT JOIN SalesInvoice si ON si.SalesInvoiceId = sid.SalesInvoiceId
                    LEFT JOIN AccountMaster am ON am.AccountMasterId = si.PartyAccountMasterId
                    INNER JOIN ItemMaster itm ON itm.ItemMasterId = sid.ItemMasterId
                    LEFT JOIN DispatchBatchDetailsUDF udf ON udf.DispatchBatchDetailsId = disb.DispatchBatchDetailsId

                    WHERE itm.ItemGroupMasterId IN (110110,110108,110107,110102,110103,110115)

                ) AS FinalData
                WHERE VinNo = %s
                """

                cursor.execute(query, [vin])
                row = cursor.fetchone()

            if not row:
                return Response({"error": "VIN not found."}, status=404)

            item_code, item_name, invoice_no, invoice_date, party_name, gst_no, vin_no = row

            return Response({
                "item_code": item_code,
                "item_name": item_name,
                "invoice_number": invoice_no,
                "purchase_date": invoice_date,
                "vin": vin_no,
                "party_name": party_name,
                "gst_no": gst_no,
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# -------------------------------------------------------------------
# Helper function for Dealer Stock Management
# -------------------------------------------------------------------
def get_dealer_and_action_user(email):
    """
    Returns (dealer, action_user, action_name, action_role)
    action_user may be Employee or None
    """
    emp = Employee.objects.filter(email=email).first()
    dealer = None
    action_user = None
    action_name = ""
    action_role = ""

    if emp and emp.role in ["DEALER_ADMIN", "DEALER_EMPLOYEE"]:
        dealer = emp.dealer
        action_user = emp
        action_name = emp.name
        action_role = emp.role
    elif Dealer.objects.filter(email=email).exists():
        dealer = Dealer.objects.get(email=email)
        action_name = dealer.name
        action_role = "DEALER_ADMIN"
    return dealer, action_user, action_name, action_role


# ----------------------------------------------------------------------
# Dealer Stock Views
# ----------------------------------------------------------------------
class DealerAvailableStockView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        email = user.email

        dealer = None
        emp = Employee.objects.filter(email=email).first()
        if emp and emp.role in ["DEALER_ADMIN", "DEALER_EMPLOYEE"]:
            dealer = emp.dealer
        elif Dealer.objects.filter(email=email).exists():
            dealer = Dealer.objects.get(email=email)

        if not dealer:
            return Response({"error": "Only dealer users can access this page."}, status=403)

        if not dealer.gst_no:
            return Response({"error": "Dealer GST number not found."}, status=400)

        search = request.query_params.get("search", "").strip()

        try:
            with connections['munim008_db'].cursor() as cursor:
                query = """
                    SELECT 
                        am.AccountName,
                        am.GSTNo,
                        a.DocumentNo,
                        a.DocumentDate,
                        sibd.BatchNo,
                        itm.ItemName,
                        itm.ItemCode,
                        itm.ProductCode
                    FROM SalesInvoice AS a
                    LEFT OUTER JOIN SalesInvoiceDetails AS b ON a.SalesInvoiceId = b.SalesInvoiceId
                    LEFT OUTER JOIN ItemMaster AS itm ON itm.ItemMasterId = b.ItemMasterId
                    LEFT OUTER JOIN SalesInvoiceBatchDetails AS sibd ON sibd.SalesInvoiceDetailsId = b.SalesInvoiceDetailsId
                    LEFT OUTER JOIN accountmaster AS am ON am.AccountMasterId = a.PartyAccountMasterId
                    WHERE itm.ItemGroupMasterId IN (2,3,5,8,10,11,12,13,14,16,29,20077,40103,40105,40107)
                    AND a.DocumentDate >= '2026-02-01'
                    AND a.DocumentDate <= GETDATE()
                    AND UPPER(LTRIM(RTRIM(am.GSTNo))) = UPPER(LTRIM(RTRIM(%s)))
                """
                params = [dealer.gst_no]
                if search:
                    query += """
                        AND (
                            sibd.BatchNo LIKE %s OR
                            itm.ItemName LIKE %s OR
                            itm.ItemCode LIKE %s
                        )
                    """
                    like_search = f"%{search}%"
                    params.extend([like_search, like_search, like_search])
                query += " ORDER BY a.DocumentDate DESC"
                cursor.execute(query, params)
                rows = cursor.fetchall()

            # Get all stock records for this dealer (both active and sold)
            dealer_stocks = DealerStockMaster.objects.filter(dealer=dealer)
            active_batches = set(dealer_stocks.filter(is_active_stock=True).values_list('batch_number', flat=True))
            sold_batches = set(dealer_stocks.filter(status='sold').values_list('batch_number', flat=True))

            data = []
            for row in rows:
                account_name, gst_no, invoice_no, invoice_date, batch_no, item_name, item_code, product_code = row
                if batch_no in sold_batches:
                    status = "sold"
                    already_in_stock = True  # prevent selection
                elif batch_no in active_batches:
                    status = "already_in_stock"
                    already_in_stock = True
                else:
                    status = "available"
                    already_in_stock = False

                data.append({
                    "account_name": account_name,
                    "gst_no": gst_no,
                    "invoice_number": invoice_no,
                    "invoice_date": invoice_date,
                    "batch_number": batch_no,
                    "item_name": item_name,
                    "item_code": item_code,
                    "product_code": product_code,
                    "already_in_stock": already_in_stock,
                    "status": status,          # new field
                })
            return Response(data, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class SaveDealerStockSelection(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.user.email
        dealer, action_user, action_name, action_role = get_dealer_and_action_user(email)
        if not dealer:
            return Response({"error": "Only dealer users can save stock."}, status=403)

        stock_items = request.data.get("stock_items", [])
        if not isinstance(stock_items, list) or not stock_items:
            return Response({"error": "stock_items list is required."}, status=400)

        saved_count = 0
        for item in stock_items:
            batch_number = item.get("batch_number")
            if not batch_number:
                continue

            obj, created = DealerStockMaster.objects.get_or_create(
                dealer=dealer,
                batch_number=batch_number,
                defaults={
                    "company": dealer.company,
                    "account_name": item.get("account_name"),
                    "gst_no": item.get("gst_no"),
                    "invoice_number": item.get("invoice_number"),
                    "invoice_date": item.get("invoice_date"),
                    "item_name": item.get("item_name"),
                    "item_code": item.get("item_code"),
                    "product_code": item.get("product_code"),
                    "is_active_stock": True,
                    "status": "active",
                    "is_selected_by_dealer": True,
                    "source": "dealer_selection",
                    "created_by": action_user,
                    "updated_by": action_user,
                }
            )
            if not created:
                obj.account_name = item.get("account_name")
                obj.gst_no = item.get("gst_no")
                obj.invoice_number = item.get("invoice_number")
                obj.invoice_date = item.get("invoice_date")
                obj.item_name = item.get("item_name")
                obj.item_code = item.get("item_code")
                obj.product_code = item.get("product_code")
                obj.is_active_stock = True
                obj.status = "active"
                obj.is_selected_by_dealer = True
                obj.updated_by = action_user
                obj.save()

            DealerStockAudit.objects.create(
                dealer_stock=obj,
                action="selected",
                action_by_employee=action_user,
                action_by_name=action_name,
                action_by_role=action_role,
                remarks="Dealer selected this machine into stock."
            )
            saved_count += 1

        return Response({"message": f"{saved_count} machine(s) added to dealer stock successfully."}, status=200)


class RemoveDealerStockSelection(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.user.email
        dealer, action_user, action_name, action_role = get_dealer_and_action_user(email)
        if not dealer:
            return Response({"error": "Only dealer users can remove stock."}, status=403)

        batch_number = request.data.get("batch_number", "").strip()
        if not batch_number:
            return Response({"error": "batch_number is required."}, status=400)

        stock = DealerStockMaster.objects.filter(
    dealer=dealer,
    batch_number=batch_number,
    is_active_stock=True      # Only active stock
).first()
        if not stock:
            return Response({"error": "Stock not found."}, status=404)

        stock.is_active_stock = False
        stock.status = "removed"
        stock.is_selected_by_dealer = False
        stock.updated_by = action_user
        stock.save()

        DealerStockAudit.objects.create(
            dealer_stock=stock,
            action="unselected",
            action_by_employee=action_user,
            action_by_name=action_name,
            action_by_role=action_role,
            remarks="Dealer removed this machine from stock."
        )
        return Response({"message": "Machine removed from dealer stock."}, status=200)


class DealerMyStockView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = request.user.email
        dealer, _, _, _ = get_dealer_and_action_user(email)
        if not dealer:
            return Response({"error": "Only dealer users can access this stock."}, status=403)

        search = request.query_params.get("search", "").strip()
        qs = DealerStockMaster.objects.filter(dealer=dealer, is_active_stock=True).order_by("-created_at")
        if search:
            qs = qs.filter(
                Q(batch_number__icontains=search) |
                Q(item_name__icontains=search) |
                Q(item_code__icontains=search)
            )
        serializer = DealerStockMasterSerializer(qs, many=True)
        return Response(serializer.data)


class CompanyDealerStockView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        email = user.email

        emp = Employee.objects.filter(email=email).first()
        company = None
        role = None

        if emp:
            role = emp.role
            if role == "APPLICATION_ADMIN":
                company = None
            elif role in ["COMPANY_ADMIN", "COMPANY_EMPLOYEE"]:
                company = emp.company
            elif role in ["DEALER_ADMIN", "DEALER_EMPLOYEE"]:
                return Response({"error": "Dealer users cannot access this page."}, status=403)
        elif Company.objects.filter(email=email).exists():
            company = Company.objects.get(email=email)
            role = "COMPANY_ADMIN"

        dealer_id = request.query_params.get("dealer_id")
        search = request.query_params.get("search", "").strip()

        qs = DealerStockMaster.objects.filter(is_active_stock=True).select_related('dealer', 'company')
        if role != "APPLICATION_ADMIN":
            qs = qs.filter(company=company)
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        if search:
            qs = qs.filter(
                Q(batch_number__icontains=search) |
                Q(item_name__icontains=search) |
                Q(item_code__icontains=search) |
                Q(dealer__name__icontains=search)
            )
        serializer = DealerStockMasterSerializer(qs, many=True)
        return Response(serializer.data)


class AddDealerStockByCompany(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.user.email
        emp = Employee.objects.filter(email=email).first()
        company_user = Company.objects.filter(email=email).first() if not emp else None

        is_allowed = False
        action_user = None
        action_name = ""
        action_role = ""

        if emp and emp.role in ["APPLICATION_ADMIN", "COMPANY_ADMIN", "COMPANY_EMPLOYEE"]:
            is_allowed = True
            action_user = emp
            action_name = emp.name
            action_role = emp.role
        elif company_user:
            is_allowed = True
            action_user = None
            action_name = company_user.name
            action_role = "COMPANY_ADMIN"

        if not is_allowed:
            return Response({"error": "Only company/admin users can add stock."}, status=403)

        dealer_id = request.data.get("dealer_id")
        batch_number = request.data.get("batch_number", "").strip()
        if not dealer_id or not batch_number:
            return Response({"error": "dealer_id and batch_number are required."}, status=400)

        dealer = Dealer.objects.filter(id=dealer_id).first()
        if not dealer:
            return Response({"error": "Dealer not found."}, status=404)

        if emp and emp.role != "APPLICATION_ADMIN" and dealer.company_id != emp.company_id:
            return Response({"error": "This dealer does not belong to your company."}, status=403)
        if company_user and dealer.company_id != company_user.id:
            return Response({"error": "This dealer does not belong to your company."}, status=403)

        try:
            with connections['munim008_db'].cursor() as cursor:
                query = """
                    SELECT 
                        am.AccountName,
                        am.GSTNo,
                        a.DocumentNo,
                        a.DocumentDate,
                        sibd.BatchNo,
                        itm.ItemName,
                        itm.ItemCode,
                        itm.ProductCode
                    FROM SalesInvoice AS a
                    LEFT OUTER JOIN SalesInvoiceDetails AS b ON a.SalesInvoiceId = b.SalesInvoiceId
                    LEFT OUTER JOIN ItemMaster AS itm ON itm.ItemMasterId = b.ItemMasterId
                    LEFT OUTER JOIN SalesInvoiceBatchDetails AS sibd ON sibd.SalesInvoiceDetailsId = b.SalesInvoiceDetailsId
                    LEFT OUTER JOIN accountmaster AS am ON am.AccountMasterId = a.PartyAccountMasterId
                    WHERE itm.ItemGroupMasterId IN (2,3,5,8,10,11,12,13,14,16,29,20077,40103,40105,40107)
                    AND sibd.BatchNo = %s
                    AND UPPER(LTRIM(RTRIM(am.GSTNo))) = UPPER(LTRIM(RTRIM(%s)))
                """
                cursor.execute(query, [batch_number, dealer.gst_no])
                row = cursor.fetchone()

            if not row:
                return Response({"error": "Machine not found in external DB for this dealer GST."}, status=404)

            account_name, gst_no, invoice_no, invoice_date, batch_no, item_name, item_code, product_code = row

            obj, created = DealerStockMaster.objects.get_or_create(
                dealer=dealer,
                batch_number=batch_no,
                defaults={
                    "company": dealer.company,
                    "account_name": account_name,
                    "gst_no": gst_no,
                    "invoice_number": invoice_no,
                    "invoice_date": invoice_date,
                    "item_name": item_name,
                    "item_code": item_code,
                    "product_code": product_code,
                    "is_active_stock": True,
                    "status": "active",
                    "is_selected_by_dealer": False,
                    "source": "company_added" if not company_user else "system_added",
                    "created_by": action_user,
                    "updated_by": action_user,
                }
            )
            if not created:
                obj.is_active_stock = True
                obj.status = "active"
                obj.updated_by = action_user
                obj.save()

            DealerStockAudit.objects.create(
                dealer_stock=obj,
                action="added",
                action_by_employee=action_user,
                action_by_name=action_name,
                action_by_role=action_role,
                remarks="Added to dealer stock by company/system user."
            )
            return Response({"message": "Machine added to dealer stock successfully."}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class DealerStockAuditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, stock_id):
        audits = DealerStockAudit.objects.filter(dealer_stock_id=stock_id).order_by('-action_time')
        serializer = DealerStockAuditSerializer(audits, many=True)
        return Response(serializer.data)


# views.py – replace SellDealerStockView with:

from django.utils import timezone
from django.db import connections
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime

from datetime import datetime

class SellDealerStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.user.email
        raw_batch = request.data.get('batch_number', '')

        if isinstance(raw_batch, dict):
            batch_number = (
                raw_batch.get('batch_number') or
                raw_batch.get('batch') or
                raw_batch.get('BatchNo') or
                raw_batch.get('value') or
                raw_batch.get('label') or
                ''
            )
        else:
            batch_number = str(raw_batch)

        batch_number = batch_number.strip()
        if not batch_number:
            return Response({"error": "batch_number is required."}, status=400)

        dealer, action_user, action_name, action_role = get_dealer_and_action_user(email)
        if not dealer:
            return Response({"error": "Only dealer users can sell stock."}, status=403)

        purchase_date = request.data.get('purchase_date')
        parsed_invoice_date = None
        if purchase_date:
            try:
                parsed_invoice_date = datetime.strptime(purchase_date, "%Y-%m-%d").date()
            except:
                parsed_invoice_date = None

        # 🔥 FIX: Only find active stock
        stock = DealerStockMaster.objects.filter(
            dealer=dealer,
            batch_number=batch_number,
            is_active_stock=True
        ).first()

        if stock:
            stock.status = 'sold'
            stock.is_active_stock = False
            stock.sold_date = timezone.now()
            stock.updated_by = action_user
            stock.save()
        else:
            try:
                with connections['munim008_db'].cursor() as cursor:
                    query = """
                        
                        AND sibd.BatchNo = %s
                        AND UPPER(LTRIM(RTRIM(am.GSTNo))) = UPPER(LTRIM(RTRIM(%s)))
                    """
                    cursor.execute(query, [batch_number, dealer.gst_no])
                    row = cursor.fetchone()

                if row:
                    account_name, gst_no, invoice_no, invoice_date, batch_no, item_name, item_code, product_code = row
                    stock = DealerStockMaster.objects.create(
                        dealer=dealer,
                        company=dealer.company,
                        batch_number=batch_no,
                        account_name=account_name,
                        gst_no=gst_no,
                        invoice_number=invoice_no,
                        invoice_date=invoice_date,
                        item_name=item_name,
                        item_code=item_code,
                        product_code=product_code,
                        is_active_stock=False,
                        status='sold',
                        is_selected_by_dealer=False,
                        source='system_added',
                        sold_date=timezone.now(),
                        created_by=action_user,
                        updated_by=action_user
                    )
                else:
                    stock = DealerStockMaster.objects.create(
                        dealer=dealer,
                        company=dealer.company,
                        batch_number=batch_number,
                        item_name=request.data.get('item_name', ''),
                        item_code=request.data.get('item_code', ''),
                        invoice_number=request.data.get('invoice_number', ''),
                        invoice_date=parsed_invoice_date,
                        is_active_stock=False,
                        status='sold',
                        is_selected_by_dealer=False,
                        source='system_added',
                        sold_date=timezone.now(),
                        created_by=action_user,
                        updated_by=action_user
                    )
            except Exception as e:
                print(f"Error creating sold stock: {e}")
                return Response({"error": f"Failed to create stock record: {str(e)}"}, status=500)

        DealerStockAudit.objects.create(
            dealer_stock=stock,
            action='sold',
            action_by_employee=action_user,
            action_by_name=action_name,
            action_by_role=action_role,
            remarks=f"Stock sold via installation submission. Batch: {batch_number}"
        )

        return Response({"message": "Stock marked as sold."}, status=200)
class ReturnDealerStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.user.email
        batch_number = request.data.get('batch_number', '').strip()
        reason = request.data.get('reason', '').strip()

        if not batch_number:
            return Response({"error": "batch_number is required."}, status=400)
        if not reason:
            return Response({"error": "Reason for return is required."}, status=400)

        dealer, action_user, action_name, action_role = get_dealer_and_action_user(email)
        if not dealer:
            return Response({"error": "Only dealer users can return stock."}, status=403)

        stock = DealerStockMaster.objects.filter(
            dealer=dealer, batch_number=batch_number, is_active_stock=True, status='active'
        ).first()
        if not stock:
            return Response({"error": "Active stock not found for this batch."}, status=404)

        DealerStockReturn.objects.create(
            dealer_stock=stock,
            dealer=dealer,
            batch_number=stock.batch_number,
            item_name=stock.item_name,
            invoice_number=stock.invoice_number,
            invoice_date=stock.invoice_date,
            returned_by_employee=action_user,
            returned_by_name=action_name,
            returned_by_role=action_role,
            reason=reason,
            remarks="Return processed by dealer"
        )

        stock.status = 'returned'
        stock.is_active_stock = False
        stock.updated_by = action_user
        stock.save()

        DealerStockAudit.objects.create(
            dealer_stock=stock,
            action='returned',
            action_by_employee=action_user,
            action_by_name=action_name,
            action_by_role=action_role,
            remarks=f"Return reason: {reason}"
        )
        return Response({"message": "Stock returned successfully."}, status=200)
class DealerSoldStockView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = request.user.email
        dealer, _, _, _ = get_dealer_and_action_user(email)
        if not dealer:
            return Response({"error": "Only dealer users can access sold stock."}, status=403)

        search = request.query_params.get("search", "").strip()

        # Get sold stock items
        qs = DealerStockMaster.objects.filter(
            dealer=dealer,
            status='sold'
        ).order_by("-sold_date")

        if search:
            qs = qs.filter(
                Q(batch_number__icontains=search) |
                Q(item_name__icontains=search) |
                Q(item_code__icontains=search)
            )

        # Need to join with MachineInstallation to get customer details and installation details
        # But the installation record is linked via batch_number
        installations = MachineInstallation.objects.filter(
            batch_number__in=qs.values_list('batch_number', flat=True)
        ).select_related('dealer', 'company', 'submitted_by')

        # Map batch_number to installation
        install_map = {inst.batch_number: inst for inst in installations}

        # Prepare response data
        data = []
        for stock in qs:
            inst = install_map.get(stock.batch_number)
            data.append({
                "id": stock.id,
                "item_name": stock.item_name,
                "item_code": stock.item_code,
                "batch_number": stock.batch_number,
                "invoice_number": stock.invoice_number,
                "purchase_date": stock.invoice_date,
                "sold_date": stock.sold_date,
                "dealer_name": dealer.name,
                "sold_by_name": stock.updated_by.name if stock.updated_by else None,
                "sold_by_role": stock.updated_by.role if stock.updated_by else None,
                "customer_company_name": inst.client_company_name if inst else None,
                "customer_gst_number": inst.client_gst_number if inst else None,
                "customer_contact_person": inst.client_contact_person if inst else None,
                "customer_contact_phone": inst.client_contact_phone if inst else None,
                "installation_date": inst.installation_date if inst else None,
                "installation_location": inst.location if inst else None,
                "installed_by": inst.installed_by if inst else None,
                "notes": inst.notes if inst else None,
            })

        return Response(data, status=200)
class ItemSearchViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ItemMasterSerializer

    def get_queryset(self):
        # Force using the correct database (same as admin)
        return ItemMaster.objects.using('munim008_db').all()

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        # Allowed ItemGroupMasterId values
        allowed_group_ids = [2,3,5,8,10,11,12,13,14,16,29,20077,40103,40105,40107]

        base_qs = ItemMaster.objects.using('munim008_db').filter(itemgroupmasterid__in=allowed_group_ids)

        if len(query) >= 2:
            base_qs = base_qs.filter(
                Q(itemname__icontains=query) | Q(itemcode__icontains=query)
            )
        else:
            base_qs = base_qs.none()  # no results for short queries

        items = base_qs[:20]
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_user_context(self, user):
        email = user.email

        emp = Employee.objects.filter(email=email).first()
        if emp:
            return ('employee', emp.role, emp.dealer, emp.company, emp)

        dealer = Dealer.objects.filter(email=email).first()
        if dealer:
            return ('dealer', 'DEALER_ADMIN', dealer, dealer.company, None)

        company = Company.objects.filter(email=email).first()
        if company:
            return ('company', 'COMPANY_ADMIN', None, company, None)

        return (None, None, None, None, None)

    def get_queryset(self):
        user_type, role, dealer, company, _ = self.get_user_context(self.request.user)

        if not user_type:
            return PurchaseOrder.objects.none()

        if role == 'APPLICATION_ADMIN':
            return PurchaseOrder.objects.all()

        elif role in ['COMPANY_ADMIN', 'COMPANY_EMPLOYEE']:
            return PurchaseOrder.objects.filter(dealer__company=company)

        elif role in ['DEALER_ADMIN', 'DEALER_EMPLOYEE']:
            return PurchaseOrder.objects.filter(dealer=dealer)

        return PurchaseOrder.objects.none()

    def create(self, request, *args, **kwargs):
        user_type, role, dealer, company, employee = self.get_user_context(request.user)

        if not user_type:
            return Response({"detail": "User not recognized."}, status=status.HTTP_403_FORBIDDEN)

        allowed_roles = ['DEALER_ADMIN', 'DEALER_EMPLOYEE', 'COMPANY_ADMIN', 'APPLICATION_ADMIN']
        if role not in allowed_roles:
            return Response({"detail": "Not authorized to create orders."}, status=status.HTTP_403_FORBIDDEN)

        # Determine dealer
        if user_type in ['employee', 'dealer'] and role in ['DEALER_ADMIN', 'DEALER_EMPLOYEE']:
            order_dealer = dealer
            if not order_dealer:
                return Response({"detail": "Dealer not assigned."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            dealer_id = request.data.get('dealer_id')
            if not dealer_id:
                return Response({"detail": "dealer_id is required."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                order_dealer = Dealer.objects.get(id=dealer_id)
            except Dealer.DoesNotExist:
                return Response({"detail": "Invalid dealer_id."}, status=status.HTTP_400_BAD_REQUEST)

            if user_type == 'company' and order_dealer.company != company:
                return Response({"detail": "Dealer does not belong to your company."},
                                status=status.HTTP_403_FORBIDDEN)

        # ✅ MULTI ITEM SUPPORT
        items = request.data.get('items', [])
        if not items or not isinstance(items, list):
            return Response({"detail": "items array is required."}, status=status.HTTP_400_BAD_REQUEST)

        created_orders = []
        errors = []

        for idx, item_data in enumerate(items):
            item_name = item_data.get('item_name')
            item_code = item_data.get('item_code')
            product_code = item_data.get('product_code', '')
            order_quantity = item_data.get('order_quantity')
            remarks = item_data.get('remarks', '')

            if not item_name or not item_code or not order_quantity:
                errors.append(f"Row {idx+1}: missing required fields.")
                continue

            try:
                quantity = int(order_quantity)
                if quantity <= 0:
                    errors.append(f"Row {idx+1}: quantity must be positive.")
                    continue
            except ValueError:
                errors.append(f"Row {idx+1}: invalid quantity.")
                continue

            serializer = PurchaseOrderCreateSerializer(data={
                'item_name': item_name,
                'item_code': item_code,
                'product_code': product_code,
                'order_quantity': quantity,
                'remarks': remarks,
            })

            if not serializer.is_valid():
                errors.append(f"Row {idx+1}: {serializer.errors}")
                continue

            order = PurchaseOrder.objects.create(
                dealer=order_dealer,
                created_by=employee if user_type == 'employee' else None,
                **serializer.validated_data
            )

            created_orders.append(PurchaseOrderSerializer(order).data)

        if errors:
            return Response({
                "partial_success": created_orders,
                "errors": errors
            }, status=207)

        return Response(created_orders, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        user_type, role, dealer, company, employee = self.get_user_context(request.user)

        allowed = False
        if user_type == 'employee' and role in ['COMPANY_ADMIN', 'COMPANY_EMPLOYEE', 'APPLICATION_ADMIN']:
            allowed = True
        elif user_type == 'company':
            allowed = True

        if not allowed:
            return Response({"detail": "Only company users can confirm orders."}, status=403)

        order = self.get_object()

        quantity = request.data.get('confirmed_quantity')
        if not quantity or int(quantity) <= 0:
            return Response({"error": "Valid positive quantity required."}, status=400)

        quantity = int(quantity)

        if quantity > order.pending_quantity:
            return Response({
                "error": f"Cannot confirm more than pending quantity ({order.pending_quantity})."
            }, status=400)

        new_pending = order.pending_quantity - quantity

        confirmation = PurchaseOrderConfirmation.objects.create(
            purchase_order=order,
            confirmed_quantity=quantity,
            confirmed_by=employee,
            pending_after=new_pending
        )

        order.pending_quantity = new_pending

        if new_pending == 0:
            order.status = 'completed'
        elif new_pending < order.order_quantity:
            order.status = 'partially_completed'

        order.save()

        return Response({
            "message": f"Confirmed {quantity} units.",
            "pending_quantity": order.pending_quantity,
            "status": order.status,
            "confirmation": PurchaseOrderConfirmationSerializer(confirmation).data
        })

    @action(detail=True, methods=['get'])
    def confirmations(self, request, pk=None):
        order = self.get_object()
        confirmations = order.confirmations.all()
        serializer = PurchaseOrderConfirmationSerializer(confirmations, many=True)
        return Response(serializer.data)