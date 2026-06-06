import stripe
from django.conf import settings
from decimal import Decimal

stripe_api_key = settings.STRIPE_SECRET_KEY
stripe.api_key = stripe_api_key

def create_stripe_product_price(name, description, currency="usd", unit_amount=0, recurring_interval="month"):
    """
    Create a Stripe product and price.
    """
    
    try:
        # Create a product
        product = stripe.Product.create(
            name=name,
            description=description
        )
        
        if not product:
            print("Failed to create Stripe product.")
            return None
        
        # Create a price for the product
        price = stripe.Price.create(
            product=product.id,
            unit_amount=unit_amount,
            currency=currency,
            recurring={"interval": recurring_interval}
        )
        
        if not price:
            print("Failed to create Stripe price.")
            return None
        
        print("Successfully created Stripe product and price.")
        return price
    except Exception as e:
        print(f"Error creating Stripe product and price: {e}")
        return None


# create checkout session that handle subscription and creating of customer automatically
def create_checkout_session(price_id, success_url, customer_email):
    """
    Create a Stripe Checkout Session for subscription.
    """
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            mode='subscription',
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            customer_email=customer_email,
            success_url=success_url,
            # cancel_url=cancel_url,
            metadata={
                "type": "subscription"
            }
        )
        print("Successfully created Stripe Checkout Session.")
        return session
    except Exception as e:
        print(f"Error creating Stripe Checkout Session: {e}")
        return None

# method to fund wallet
def fund_wallet_stripe(amount, currency="usd", success_url="", customer_email=""):
    """
    Create a Stripe Checkout Session for one-time payment to fund wallet.
    """
    
    try:
        session = stripe.checkout.Session.create(
            mode='payment',
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': { 'name': 'Wallet Funding' },
                    'unit_amount':  int(Decimal(amount) * 100),  # amount in cents
                },
                'quantity': 1,
            }],
            customer_email=customer_email,
            success_url=success_url,
            metadata={
                "type": "wallet_fund"
            }
        )
        print("Successfully created Stripe Checkout Session for wallet funding.")
        return session
    except Exception as e:
        print(f"Error creating Stripe Checkout Session for wallet funding: {e}")
        return None
