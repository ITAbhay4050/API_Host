from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    DealerAvailableStockView,DealerStockAuditView,
    SaveDealerStockSelection,
    RemoveDealerStockSelection,DashboardSummaryView,
    DealerMyStockView,DealerSoldStockView,
    CompanyDealerStockView,
    AddDealerStockByCompany,SellDealerStockView,ReturnDealerStockView,
    DealerStockAuditView,PurchaseOrderViewSet, ItemSearchViewSet
)
router = DefaultRouter()
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r"ticket-categories", views.TicketCategoryViewSet)
router.register(r"tickets", views.TicketViewSet)
router.register(r"users", views.UserRoleViewSet, basename="user")
po_router = DefaultRouter()
po_router.register('orders', PurchaseOrderViewSet, basename='purchase-order')
po_router.register('items', ItemSearchViewSet, basename='item-master')

urlpatterns = [
    path('purchase/', include(po_router.urls)),
    # Authentication & Registration
    path("register/company/", views.RegisterCompany.as_view(), name="register_company"),
    path("companies/", views.CompanyListView.as_view(), name="company_list"),
    path("machine-details-by-batch/", views.get_machine_details_by_batch, name="machine_details_by_batch"),
    path("register/employee/", views.RegisterEmployee.as_view(), name="register_employee"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("send-otp/", views.SendOTPView.as_view(), name="send_otp"),
    path("verify-otp/", views.VerifyOTPView.as_view(), name="verify_otp"),

    # Dealers

    path("dealers/", views.DealerListView.as_view(), name="dealer_list"),
    path("dealers/<int:pk>/", views.DealerDetailView.as_view(), name="dealer_detail"),
    path("dealers/count/", views.DealerCountView.as_view(), name="dealer_count"),
    path("dealers/get-data-by-batch/", views.GetDealerDataByBatch.as_view(), name="get_dealer_data_by_batch"),

    # Employees
    path("employees/<int:pk>/", views.EmployeeDetailView.as_view(), name="employee_detail"),

    # Machine Installations
    path("installations/create/", views.create_machine_installation, name="create_installation"),
    path("installations/list/", views.MachineInstallationListView.as_view(), name="installation_list"),
    path("installations/check-batch-unique/", views.check_batch_unique, name="check_batch_unique"),
    path("installations/get-details-by-batch/", views.get_machine_details_by_batch, name="get_machine_details_by_batch"),

    # Party details
    path("party/get-details-by-gst/", views.GetPartyDetailsByGST.as_view(), name="get_party_details_by_gst"),
    path("departments/", views.get_departments, name="departments"),
    path("machine-details/", views.GetMachineDetails.as_view(), name="machine_details"),

    # Routers
    path("", include(router.urls)),
    #For Dealer Stock
    path('dealer-stock/available/', DealerAvailableStockView.as_view(), name='dealer-available-stock'),
    path('dealer-stock/save-selection/', SaveDealerStockSelection.as_view(), name='save-dealer-stock-selection'),
    path('dealer-stock/remove-selection/', RemoveDealerStockSelection.as_view(), name='remove-dealer-stock-selection'),
    path('dealer-stock/my-stock/', DealerMyStockView.as_view(), name='dealer-my-stock'),
    path('dealer-stock/company-view/', CompanyDealerStockView.as_view(), name='company-dealer-stock-view'),
    path('dealer-stock/company-add/', AddDealerStockByCompany.as_view(), name='company-add-dealer-stock'),
    path('dealer-stock/audit/<int:stock_id>/', DealerStockAuditView.as_view(), name='dealer-stock-audit'),
    path('dealer-stock/sell/', SellDealerStockView.as_view(), name='sell-dealer-stock'),
    path('dealer-stock/return/', ReturnDealerStockView.as_view(), name='return-dealer-stock'),
    path('dealer-stock/sold/', DealerSoldStockView.as_view(), name='dealer-sold-stock'),
    path('purchase/orders/<int:pk>/confirm/', PurchaseOrderViewSet.as_view({'post': 'confirm'}), name='purchase-order-confirm'),
    path('purchase/', include(po_router.urls)),
    #path('api/purchase/', include('purchase_order.urls')),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
     
]