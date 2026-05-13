import random
from django.core.mail import send_mail
from django.conf import settings
from .models import Employee, Dealer
def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(email, otp):
    subject = 'Your OTP for Registration'
    message = f'Your OTP for completing registration is: {otp}'
    from_email = settings.EMAIL_HOST_USER
    recipient_list = [email]
    send_mail(subject, message, from_email, recipient_list)

def get_dealer_gst_from_user(user):
    """
    Returns the GST number of the dealer associated with the user.
    For dealer_admin: returns dealer.gst_no.
    For dealer_employee: returns employee.dealer.gst_no.
    For others: returns None.
    """
    # Try employee first (covers dealer_employee, company_employee, etc.)
    employee = Employee.objects.filter(email=user.email).first()
    if employee and employee.dealer:
        return employee.dealer.gst_no

    # Then try direct dealer
    dealer = Dealer.objects.filter(email=user.email).first()
    if dealer:
        return dealer.gst_no

    return None
