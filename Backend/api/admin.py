from django.contrib import admin
from django.contrib import messages
from django.db.models import Q
from .models import Company, Dealer, LoginRecord, MachineInstallation, Task, Employee,ItemMaster
from django.contrib.auth.hashers import make_password
from .models import SalesInvoice,ticket,TicketCategory, PurchaseOrder, PurchaseOrderConfirmation
from django.contrib.contenttypes.models import ContentType
from django import forms
from django.core.exceptions import ValidationError # Import ValidationError

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'country', 'gst_no', 'created_at', 'email')
    search_fields = ('name', 'gst_no', 'email')

@admin.register(Dealer)
class DealerAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'phone', 'company', 'city', 'state', 'created_at')
    search_fields = ('name', 'email', 'company__name')
    list_filter = ('company', 'state', 'created_at')

@admin.register(LoginRecord)
class LoginRecordAdmin(admin.ModelAdmin):
    list_display = ('email', 'user_type', 'login_time', 'success')
    list_filter = ('user_type', 'success')
    search_fields = ('email',)

@admin.register(MachineInstallation)
class MachineInstallationAdmin(admin.ModelAdmin):
    list_display = [ 'batch_number','installation_date', 'submitted_by_name']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'deadline',
        'priority',
        'status',
        'assigner',      # shows company name via __str__
        'assignee',      # shows employee name via __str__
        'created_at',
    )
    list_filter = ('priority', 'status', 'deadline')
    search_fields = ('title', 'description', 'assigner__name', 'assignee__name')
    raw_id_fields = ('assigner', 'assignee')   # better for large datasets
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "role_display",
                    "company_name", "dealer_name", "is_active",
                    "created_at")
    list_filter = ("role", "is_active", "company", "dealer")
    search_fields = ("name", "email", "phone", "company__name", "dealer__name")
    ordering = ('-created_at',)
    list_select_related = ('company', 'dealer')
    actions = ['activate_employees', 'deactivate_employees']

    fieldsets = (
        (None, {
            'fields': ('name', 'email', 'phone', 'Department', 'role', 'password')
        }),
        ('Relationships', {
            'fields': ('company', 'dealer'),
        }),
        ('Status', {
            'fields': ('is_active',),
        }),
    )

    readonly_fields = ('created_at',)

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ('role', 'company', 'dealer')
        return self.readonly_fields

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_superuser:
            qs = qs.filter(
                Q(company__admin=request.user) |
                Q(dealer__admin=request.user) |
                Q(pk=request.user.pk)
            )
        return qs

    def role_display(self, obj):
        return obj.get_role_display()
    role_display.short_description = 'Role'
    role_display.admin_order_field = 'role'

    def company_name(self, obj):
        return obj.company.name if obj.company else "—"
    company_name.short_description = 'Company'
    company_name.admin_order_field = 'company__name'

    def dealer_name(self, obj):
        return obj.dealer.name if obj.dealer else "—"
    dealer_name.short_description = 'Dealer'
    dealer_name.admin_order_field = 'dealer__name'

    def activate_employees(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"Successfully activated {updated} employee(s).",
            messages.SUCCESS
        )
    activate_employees.short_description = "Activate selected employees"

    def deactivate_employees(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"Successfully deactivated {updated} employee(s).",
            messages.SUCCESS
        )
    deactivate_employees.short_description = "Deactivate selected employees"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.password = make_password(form.cleaned_data['password'])
        super().save_model(request, obj, form, change)
@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    list_display = ('SalesInvoiceId', 'DocumentNo', 'DocumentDate')
    search_fields = ('DocumentNo', 'AccountName')
    list_filter = ('DocumentDate',)

class TicketAdminForm(forms.ModelForm):
    created_by_selector = forms.ChoiceField(
        required=False,
        label="Created By"
    )
    assigned_to_selector = forms.ChoiceField(
        required=False,
        label="Assigned To"
    )

    class Meta:
        model = ticket # Make sure this is 'Ticket' (capital T)
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        # Retrieve the instance passed to the form
        instance = kwargs.get('instance')

        # If it's a new instance (add view) and 'instance' is None,
        # create a temporary empty Ticket object to prevent GFK access errors
        # in the form's __init__ when trying to read self.instance.created_by_content_type etc.
        if instance is None:
            # Create a detached instance. It won't be saved to the DB.
            # This instance exists purely for the form's logic during rendering/initialization.
            temp_instance = ticket(
                created_by_content_type=None,
                created_by_object_id=None,
                assigned_to_content_type=None,
                assigned_to_object_id=None,
                # Set other non-nullable fields to a default if your model requires them to prevent save errors later.
                # For Ticket, title, description, category, status are required.
                # You might need to set dummy values for these to prevent ValidationError during form init
                # IF the form's initial data isn't enough.
                # E.g., title='dummy', description='dummy', category='dummy', status='open'
            )
            kwargs['instance'] = temp_instance # Use this temporary instance for the form's self.instance

        super().__init__(*args, **kwargs)

        # Your existing logic to populate choices and initial values
        all_related_objects = []
        all_related_objects.extend(Company.objects.all())
        all_related_objects.extend(Dealer.objects.select_related('company').all())
        all_related_objects.extend(Employee.objects.select_related('company', 'dealer').all())

        all_related_objects.sort(key=lambda x: str(x).lower())

        choices = [('', '---------')]
        for obj in all_related_objects:
            model_name = obj._meta.model_name
            value = f"{model_name}-{obj.pk}"
            if isinstance(obj, Company):
                display_name = f"Company: {obj.name}"
            elif isinstance(obj, Dealer):
                company_name = obj.company.name if obj.company else 'N/A'
                display_name = f"Dealer: {obj.name} (from {company_name})"
            elif isinstance(obj, Employee):
                role_display = obj.get_role_display() if hasattr(obj, 'get_role_display') else obj.role
                display_name = f"Employee: {obj.name} ({role_display})"
            else:
                display_name = str(obj)
            choices.append((value, display_name))

        self.fields['created_by_selector'].choices = choices
        self.fields['assigned_to_selector'].choices = choices

        # This block now safely accesses self.instance, as it will always be a Ticket object (real or temporary)
        if self.instance.pk: # Only for existing objects (change view)
            if self.instance.created_by_content_type and self.instance.created_by_object_id:
                model_name = self.instance.created_by_content_type.model
                self.initial['created_by_selector'] = f"{model_name}-{self.instance.created_by_object_id}"
            if self.instance.assigned_to_content_type and self.instance.assigned_to_object_id:
                model_name = self.instance.assigned_to_content_type.model
                self.initial['assigned_to_selector'] = f"{model_name}-{self.instance.assigned_to_object_id}"

        # Remove the default ContentType and object_id fields from the form
        if 'created_by_content_type' in self.fields:
            del self.fields['created_by_content_type']
        if 'created_by_object_id' in self.fields:
            del self.fields['created_by_object_id']
        if 'assigned_to_content_type' in self.fields:
            del self.fields['assigned_to_content_type']
        if 'assigned_to_object_id' in self.fields:
            del self.fields['assigned_to_object_id']

        self.fields['machine_installation'].required = False

    def clean(self):
        cleaned_data = super().clean()

        # Handle created_by_selector
        created_by_value = cleaned_data.get('created_by_selector')
        if created_by_value:
            try:
                model_name, pk = created_by_value.split('-', 1)
                content_type = ContentType.objects.get(model=model_name)
                obj_model_class = content_type.model_class()
                obj_model_class.objects.get(pk=pk)  # Validate object exists

                self.instance.created_by_content_type = content_type
                self.instance.created_by_object_id = pk
            except Exception:
                self.add_error('created_by_selector', "Invalid selection for Created By.")
        else:
            self.instance.created_by_content_type = None
            self.instance.created_by_object_id = None

        # Handle assigned_to_selector
        assigned_to_value = cleaned_data.get('assigned_to_selector')
        if assigned_to_value:
            try:
                model_name, pk = assigned_to_value.split('-', 1)
                content_type = ContentType.objects.get(model=model_name)
                obj_model_class = content_type.model_class()
                obj_model_class.objects.get(pk=pk)

                self.instance.assigned_to_content_type = content_type
                self.instance.assigned_to_object_id = pk
            except Exception:
                self.add_error('assigned_to_selector', "Invalid selection for Assigned To.")
        else:
            self.instance.assigned_to_content_type = None
            self.instance.assigned_to_object_id = None

        return cleaned_data

@admin.register(ticket)
class TicketAdmin(admin.ModelAdmin):
    form = TicketAdminForm

    list_display = (
        "title",
        "item_name",
        "item_code",
        "batch_number",
        "invoice_number",
        "purchase_date",
        "category",
        "status",
        "urgency",
        "display_created_by",
        "display_assigned_to",
        "created_at",
    )

    list_filter = (
        "status",
        "urgency",
        "category",
        "purchase_date",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "item_name",
        "item_code",
        "batch_number",
        "invoice_number",
    )

    fieldsets = (
        ("Ticket Information", {
            "fields": (
                "title",
                "description",
                "category",
                "status",
                "urgency",
            )
        }),

        ("Machine / Product Details", {
            "fields": (
                "item_name",
                "item_code",
                "batch_number",
                "invoice_number",
                "purchase_date",
                "remarks",
                "machine_installation",
            )
        }),

        ("Users", {
            "fields": (
                "created_by_selector",
                "assigned_to_selector",
            )
        }),

        ("Feedback & Resolution", {
            "fields": (
                "resolved_at",
                "feedback_notes",
                "rating",
            ),
            "classes": ("collapse",),
        }),
    )

    exclude = (
        "created_by_content_type",
        "created_by_object_id",
        "assigned_to_content_type",
        "assigned_to_object_id",
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "category",
            "machine_installation",
            "created_by_content_type",
            "assigned_to_content_type",
        )

    def display_created_by(self, obj):
        return str(obj.created_by) if obj.created_by else "N/A"
    display_created_by.short_description = "Created By"

    def display_assigned_to(self, obj):
        return str(obj.assigned_to) if obj.assigned_to else "Unassigned"
    display_assigned_to.short_description = "Assigned To"


admin.site.register(TicketCategory)

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'dealer', 'item_name', 'order_quantity', 'pending_quantity', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['dealer__name', 'item_name', 'item_code']

@admin.register(PurchaseOrderConfirmation)
class PurchaseOrderConfirmationAdmin(admin.ModelAdmin):
    list_display = ['id', 'purchase_order', 'confirmed_quantity', 'confirmed_by', 'confirmed_at']
@admin.register(ItemMaster)
class ItemMasterAdmin(admin.ModelAdmin):
    list_display = ['itemname', 'itemcode', 'productcode', 'itemgroupmasterid']
    search_fields = ['itemname', 'itemcode']
    list_filter = ['itemgroupmasterid']

    def get_queryset(self, request):
        # Force using the 'munim008_db' database for this read‑only model
        return super().get_queryset(request).using('munim008_db')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions