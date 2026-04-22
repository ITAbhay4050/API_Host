"""
serializers.py — DRF serializers for Comptech Equipment Ltd.
Updated with proper ItemMaster joins for dealer GST validation.
"""
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.hashers import make_password
from .models import PurchaseOrder, PurchaseOrderConfirmation, ItemMaster
from django.utils import timezone
from rest_framework import serializers
from .models import DealerStockMaster, DealerStockAudit
from django.db import connections

from .models import (
    Company,
    Dealer,
    MachineInstallation,
    InstallationPhoto,
    Task,
    Department,
    Employee,
    TicketCategory,
    ticket,
    AccountMaster,
)

# ────────────────────────────────────────────────────────────────
# Company & Dealer (unchanged)
# ────────────────────────────────────────────────────────────────

class CompanySerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Company
        fields = "__all__"
        extra_kwargs = {'password': {'write_only': True}}


class DealerSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    isDirect = serializers.BooleanField(write_only=True, required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Dealer
        fields = [
            "id", "company", "company_name", "name", "email", "phone",
            "address", "city", "state", "country", "pin_code", "gst_no",
            "pan_no", "password", "created_at", "isDirect", "otp",
            "otp_created_at", "is_verified",
        ]
        read_only_fields = ["id", "created_at", "company_name", "otp", "otp_created_at", "is_verified"]

    def validate_phone(self, value):
        digits = "".join(filter(str.isdigit, value))
        if len(digits) < 9 or len(digits) > 15:
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def create(self, validated_data):
        validated_data.pop("isDirect", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = make_password(password)
        validated_data.pop("isDirect", None)
        return super().update(instance, validated_data)


# ────────────────────────────────────────────────────────────────
# AccountMaster (external DB) – read‑only
# ────────────────────────────────────────────────────────────────
class AccountMasterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='accountname', read_only=True)
    gst_no = serializers.CharField(source='gstno', read_only=True)
    pan_no = serializers.CharField(read_only=True)

    class Meta:
        model = AccountMaster
        fields = ['accountmasterid', 'name', 'email', 'pan_no', 'gst_no']
        read_only_fields = fields


# ────────────────────────────────────────────────────────────────
# Machine Installation & photos (unchanged)
# ────────────────────────────────────────────────────────────────
class InstallationPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstallationPhoto
        fields = ["id", "photo"]
        read_only_fields = fields


class MachineInstallationSerializer(serializers.ModelSerializer):
    photos = InstallationPhotoSerializer(many=True, read_only=True)
    photo_files = serializers.ListField(
        child=serializers.ImageField(max_length=5_000_000, allow_empty_file=False, use_url=False),
        write_only=True, required=False,
        help_text="JPEG/PNG ≤ 5 MB each; maximum 3 files",
    )

    class Meta:
        model = MachineInstallation
        fields = [
            "id", "company", "dealer", "item_name", "item_code",
            "batch_number", "invoice_number", "purchase_date",
            "client_company_name", "client_gst_number", "client_contact_person",
            "client_contact_phone", "installation_date", "installed_by",
            "location", "notes", "submitted_by", "submitted_by_role",
            "submitted_by_name", "created_at", "photo_files", "photos",
        ]
        read_only_fields = ["id", "created_at", "photos"]
        extra_kwargs = {'submitted_by': {'write_only': True}}

    def validate_photo_files(self, value):
        if len(value) > 3:
            raise serializers.ValidationError("You can upload a maximum of 3 photos.")
        return value

    def create(self, validated_data):
        files = validated_data.pop("photo_files", [])
        installation = super().create(validated_data)
        for img in files:
            InstallationPhoto.objects.create(installation=installation, photo=img)
        return installation


# ────────────────────────────────────────────────────────────────
# Task (unchanged)
# ────────────────────────────────────────────────────────────────
class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.ReadOnlyField(source='assignee.name')
    assigner_name = serializers.ReadOnlyField(source='assigner.name')
    assignee = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), required=False, allow_null=True)
    assigner = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'created_at', 'deadline',
            'priority', 'status', 'assigner', 'assignee',
            'assigner_name', 'assignee_name'
        ]
        read_only_fields = ['id', 'created_at', 'assigner_name', 'assignee_name']

    def validate_deadline(self, value):
        today = timezone.now().date()
        if value < today:
            raise serializers.ValidationError("Deadline cannot be in the past.")
        if value > today + timedelta(days=365):
            raise serializers.ValidationError("Deadline cannot be more than a year away.")
        return value

    def validate(self, data):
        assignee = data.get('assignee')
        assigner = data.get('assigner')
        if assignee and assigner:
            if assignee.role != "COMPANY_EMPLOYEE":
                raise serializers.ValidationError({"assignee": "Tasks can only be assigned to a Company Employee."})
            if assignee.company != assigner:
                raise serializers.ValidationError({"assignee": "This employee does not belong to the assigning company."})
        return data


# ────────────────────────────────────────────────────────────────
# Employee (unchanged)
# ────────────────────────────────────────────────────────────────
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "department_name"]


class EmployeeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.get("password")
        if password:
            validated_data["password"] = make_password(password)
        return super().update(instance, validated_data)


# ────────────────────────────────────────────────────────────────
# Generic Related Field (for Ticket)
# ────────────────────────────────────────────────────────────────
class GenericRelatedField(serializers.Field):
    def to_representation(self, obj):
        if obj is None:
            return None
        return {
            "content_type": obj._meta.model_name,
            "object_id": obj.pk,
            "display_name": str(obj),
        }

    def to_internal_value(self, data):
        if data is None:
            return None
        if not isinstance(data, dict):
            raise serializers.ValidationError("Expected dict with content_type + object_id.")
        model = data.get("content_type")
        obj_id = data.get("object_id")
        if not model or obj_id is None:
            raise serializers.ValidationError("Both content_type and object_id are required.")

        try:
            content_type = ContentType.objects.get(model=model)
        except ContentType.DoesNotExist:
            raise serializers.ValidationError(f"Invalid content_type: {model}")

        allowed = ['dealer', 'company', 'employee']
        if model not in allowed:
            raise serializers.ValidationError(
                f"content_type '{model}' is not allowed. Choose one of: {', '.join(allowed)}"
            )

        model_cls = content_type.model_class()
        if not model_cls:
            raise serializers.ValidationError("Invalid content_type resolution.")
        try:
            model_cls.objects.get(pk=obj_id)
        except model_cls.DoesNotExist:
            raise serializers.ValidationError(f"Object {obj_id} not found in {model}.")

        return {"content_type": content_type, "object_id": obj_id}


# ============================== TICKET CATEGORY ==============================
class TicketCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketCategory
        fields = '__all__'


# ============================== TICKET ==============================
class TicketSerializer(serializers.ModelSerializer):
    created_by = GenericRelatedField()
    assigned_to = GenericRelatedField(allow_null=True)

    category_name = serializers.CharField(source='category.name', read_only=True)
    machine_installation_display = serializers.CharField(
        source='machine_installation.__str__', read_only=True
    )

    class Meta:
        model = ticket
        fields = [
            'id', 'title', 'description', 'category', 'category_name',
            'status', 'urgency', 'batch_number', 'item_name', 'item_code',
            'invoice_number', 'purchase_date', 'remarks', 'vin',
            'created_by', 'assigned_to',
            'machine_installation', 'machine_installation_display',
            'created_at', 'started_at', 'resolved_at', 'feedback_notes', 'rating',
        ]
        read_only_fields = ['id', 'created_at', 'started_at']

    # ============================== VALIDATION ==============================
    def validate(self, data):
        # ---------- Basic validations ----------
        if data.get('resolved_at') and data['resolved_at'] > timezone.now():
            raise serializers.ValidationError({
                'resolved_at': "Date cannot be in the future."
            })

        if data.get('status') == 'resolved' and not data.get('resolved_at'):
            raise serializers.ValidationError({
                'status': "Resolved tickets must have a resolved_at date."
            })

        if data.get('rating') is not None and not (1 <= data['rating'] <= 5):
            raise serializers.ValidationError({
                'rating': "Rating must be between 1 and 5 stars."
            })

        # ---------- Assigned To Validation ----------
        assigned_to = data.get('assigned_to')
        if assigned_to is not None:
            content_type = assigned_to.get('content_type')
            object_id = assigned_to.get('object_id')
            if content_type.model != 'employee':
                raise serializers.ValidationError({
                    'assigned_to': "Tickets can only be assigned to company employees."
                })
            try:
                employee = Employee.objects.get(pk=object_id)
            except Employee.DoesNotExist:
                raise serializers.ValidationError({
                    'assigned_to': f"Employee with id {object_id} does not exist."
                })
            if employee.company is None:
                raise serializers.ValidationError({
                    'assigned_to': "The selected employee is not a company employee."
                })

        # ---------- Dealer GST Validation (only on create) ----------
        request = self.context.get('request')
         #request = self.context.get('request')
        if request and request.user.is_authenticated and not self.instance:
            user = request.user
            user_email = user.email

            # Determine if the user is a dealer (admin or employee)
            dealer_obj = None
            user_gst = None
            company_name = None

            # Check dealer admin
            dealer = Dealer.objects.filter(email=user_email).first()
            if dealer:
                dealer_obj = dealer
                user_gst = dealer.gst_no
                if dealer.company:
                    company_name = dealer.company.name
            else:
                # Check dealer employee
                emp = Employee.objects.filter(email=user_email, role='DEALER_EMPLOYEE').first()
                if emp and emp.dealer:
                    dealer_obj = emp.dealer
                    user_gst = emp.dealer.gst_no
                    if emp.dealer.company:
                        company_name = emp.dealer.company.name

            # Proceed only if we have a dealer with a company and GST number
            if dealer_obj and company_name and user_gst:
                company_lower = company_name.lower()
                is_equipment = 'comptech equipment' in company_lower
                is_motocorp = 'comptech motocorp' in company_lower

                if is_equipment:
                    batch = data.get('batch_number')
                    if not batch:
                        raise serializers.ValidationError(
                            {'batch_number': 'Batch number is required for equipment dealers.'}
                        )
                    # Fetch GST from munim006_db using the batch number
                    try:
                        with connections['munim006_db'].cursor() as cursor:
                            # ✅ Corrected query with TOP 1 for SQL Server
                            query = """
                                SELECT TOP 1 am.GSTNo
                                FROM SalesInvoice a
                                INNER JOIN SalesInvoiceDetails b ON a.SalesInvoiceId = b.SalesInvoiceId
                                INNER JOIN SalesInvoiceBatchDetails sibd ON sibd.SalesInvoiceDetailsId = b.SalesInvoiceDetailsId
                                INNER JOIN ItemMaster itm ON itm.ItemMasterId = b.ItemMasterId
                                INNER JOIN AccountMaster am ON am.AccountMasterId = a.PartyAccountMasterId
                                WHERE sibd.BatchNo = %s
                                  AND itm.ItemGroupMasterId IN (2,3,5,8,10,11,12,13,14,16,29,20077,40103,40105,40107)
                            """
                            cursor.execute(query, [batch])
                            row = cursor.fetchone()
                            if row:
                                db_gst = row[0]
                            else:
                                raise serializers.ValidationError(
                                    {'batch_number': 'Invalid batch number or machine not found.'}
                                )
                    except Exception as e:
                        raise serializers.ValidationError(
                            {'batch_number': f'Error validating batch: {str(e)}'}
                        )
                    if user_gst.strip().upper() != (db_gst or '').strip().upper():
                        raise serializers.ValidationError(
                            {'gst': 'GST mismatch. You are not authorized to create this ticket.'}
                        )

                elif is_motocorp:
                    vin = data.get('vin')
                    if not vin:
                        raise serializers.ValidationError(
                            {'vin': 'VIN number is required for Motocorp dealers.'}
                        )
                    # Fetch GST from munim010_db using the VIN
                    try:
                        with connections['munim010_db'].cursor() as cursor:
                            # ✅ Corrected query with ItemMaster join (same as in views.py)
                            query = """
                                SELECT GSTNo FROM (
                                    SELECT am.GSTNo, COALESCE(
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
                                    SELECT am.GSTNo, COALESCE(
                                        NULLIF(NULLIF(udf.UDF_VinNo_2116,'0'),''),
                                        NULLIF(NULLIF(udf.UDF_Vinnumber_2116,'0'),'')
                                    ) AS VinNo
                                    FROM DispatchBatchDetails disb
                                    INNER JOIN DispatchDetails disd ON disd.DispatchDetailsId = disb.DispatchDetailsId
                                    INNER JOIN Dispatch dis ON dis.DispatchId = disd.DispatchId
                                    LEFT JOIN SalesInvoiceDetails sid ON sid.ReferenceId = disd.DispatchDetailsId
                                    LEFT JOIN SalesInvoice si ON si.SalesInvoiceId = sid.SalesInvoiceId
                                    LEFT JOIN AccountMaster am ON am.AccountMasterId = si.PartyAccountMasterId
                                    LEFT JOIN ItemMaster itm ON itm.ItemMasterId = sid.ItemMasterId
                                    LEFT JOIN DispatchBatchDetailsUDF udf ON udf.DispatchBatchDetailsId = disb.DispatchBatchDetailsId
                                    WHERE itm.ItemGroupMasterId IN (110110,110108,110107,110102,110103,110115)
                                ) Combined
                                WHERE VinNo = %s
                            """
                            cursor.execute(query, [vin])
                            row = cursor.fetchone()
                            if row:
                                db_gst = row[0]
                            else:
                                raise serializers.ValidationError(
                                    {'vin': 'Invalid VIN number or machine not found.'}
                                )
                    except Exception as e:
                        raise serializers.ValidationError(
                            {'vin': f'Error validating VIN: {str(e)}'}
                        )
                    if user_gst.strip().upper() != (db_gst or '').strip().upper():
                        raise serializers.ValidationError(
                            {'gst': 'GST mismatch. You are not authorized to create this ticket.'}
                        )

        return data

    # ============================== GFK HANDLER ==============================
    def _assign_gfk(self, instance, field, gfk_data):
        if gfk_data:
            setattr(instance, f"{field}_content_type", gfk_data["content_type"])
            setattr(instance, f"{field}_object_id", gfk_data["object_id"])
        else:
            setattr(instance, f"{field}_content_type", None)
            setattr(instance, f"{field}_object_id", None)

    # ============================== CREATE ==============================
    def create(self, validated_data):
        created_by = validated_data.pop('created_by', None)
        assigned_to = validated_data.pop('assigned_to', None)

        ticket_obj = ticket(**validated_data)

        self._assign_gfk(ticket_obj, 'created_by', created_by)
        self._assign_gfk(ticket_obj, 'assigned_to', assigned_to)

        if ticket_obj.status == 'in_progress' and not ticket_obj.started_at:
            ticket_obj.started_at = timezone.now()

        ticket_obj.save()
        return ticket_obj

    # ============================== UPDATE ==============================
    def update(self, instance, validated_data):
        created_by = validated_data.pop('created_by', None)
        assigned_to = validated_data.pop('assigned_to', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if instance.status == 'in_progress' and not instance.started_at:
            instance.started_at = timezone.now()

        if created_by is not None:
            self._assign_gfk(instance, 'created_by', created_by)

        if assigned_to is not None:
            self._assign_gfk(instance, 'assigned_to', assigned_to)

        instance.save()
        return instance


# ============================== USER ROLE SERIALIZER ==============================
class UserRoleSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    email = serializers.EmailField()
    role = serializers.SerializerMethodField()
    companyId = serializers.SerializerMethodField()
    dealerId = serializers.SerializerMethodField()

    def get_id(self, obj):
        return obj.id

    def get_name(self, obj):
        return obj.name

    def get_role(self, obj):
        if isinstance(obj, Employee):
            return obj.role
        elif isinstance(obj, Dealer):
            return "DEALER_ADMIN"
        elif isinstance(obj, Company):
            return "COMPANY_ADMIN"
        return "UNKNOWN_ROLE"

    def get_companyId(self, obj):
        if hasattr(obj, 'company_id'):
            return obj.company_id
        elif isinstance(obj, Company):
            return obj.id
        return None

    def get_dealerId(self, obj):
        if hasattr(obj, 'dealer_id'):
            return obj.dealer_id
        elif isinstance(obj, Dealer):
            return obj.id
        return None


class DealerStockMasterSerializer(serializers.ModelSerializer):
    dealer_name = serializers.CharField(source='dealer.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = DealerStockMaster
        fields = '__all__'


class DealerStockAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealerStockAudit
        fields = '__all__'
class ItemMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemMaster
        fields = ['itemname', 'itemcode', 'productcode']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    dealer_name = serializers.CharField(source='dealer.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    confirmations = serializers.PrimaryKeyRelatedField(read_only=True, many=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'dealer', 'dealer_name', 'item_name', 'item_code', 'product_code',
            'order_quantity', 'pending_quantity', 'remarks', 'created_by', 'created_by_name',
            'created_at', 'status', 'confirmations'
        ]
        read_only_fields = ['pending_quantity', 'status', 'created_at', 'created_by']

class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = ['item_name', 'item_code', 'product_code', 'order_quantity', 'remarks']

    def validate_order_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        return value

class PurchaseOrderConfirmationSerializer(serializers.ModelSerializer):
    confirmed_by_name = serializers.CharField(source='confirmed_by.name', read_only=True)

    class Meta:
        model = PurchaseOrderConfirmation
        fields = ['id', 'confirmed_quantity', 'confirmed_by', 'confirmed_by_name', 'confirmed_at', 'pending_after']
class ItemMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemMaster
        fields = ['itemname', 'itemcode', 'productcode']