from rest_framework import permissions
from .models import Employee, Company
class IsDealerUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                hasattr(request.user, 'employee') and 
                request.user.employee.role in ['DEALER_ADMIN', 'DEALER_EMPLOYEE'])

class IsCompanyUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        email = request.user.email

        # Employee with a company role
        emp = Employee.objects.filter(email=email).first()
        if emp and emp.role in ['COMPANY_ADMIN', 'COMPANY_EMPLOYEE', 'APPLICATION_ADMIN']:
            return True

        # Direct Company login
        company = Company.objects.filter(email=email).first()
        if company:
            return True

        return False

class IsSystemAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                hasattr(request.user, 'employee') and 
                request.user.employee.role == 'APPLICATION_ADMIN')