from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import uuid
from typing import Optional, Tuple

from .models import WalletTransaction
from create_user.models import Referral, ReferralWallet, WithdrawalRequest, TalentProfile


class ReferralRewardService:
    """Handle referral reward crediting"""
    
    REFERRAL_REWARD_AMOUNT = Decimal('1000.00')  # 1k tokens
    
    @staticmethod
    def get_or_create_referral_wallet(talent_profile):
        """Get or create referral wallet for talent profile"""
        wallet, created = ReferralWallet.objects.get_or_create(talent=talent_profile)
        return wallet
    
    @classmethod
    @transaction.atomic
    def credit_referral_reward(cls, referral_obj: Referral) -> Tuple[bool, str, Optional[WalletTransaction]]:
        """
        Credit referral reward when invitee pays and takes assessment
        
        Returns:
            Tuple of (success: bool, message: str, transaction: WalletTransaction or None)
        """
        # Check if already rewarded
        if referral_obj.has_received_reward:
            return False, "Reward already credited", None
        
        # Get inviter's talent profile
        inviter_talent = referral_obj.inviter
        inviter_user = inviter_talent.user
        
        # Get or create referral wallet
        referral_wallet = cls.get_or_create_referral_wallet(inviter_talent)
        
        # Create transaction record
        txn_ref = f"REF-REWARD-{uuid.uuid4().hex[:12].upper()}"
        
        wallet_transaction = WalletTransaction.objects.create(
            user=inviter_user,
            referral=referral_obj,
            referral_withdrawal=referral_wallet,
            amount=cls.REFERRAL_REWARD_AMOUNT,
            transaction_type=WalletTransaction.TRANSACTION_TYPE.TALENT_REFERRAL_REWARD,
            ref=txn_ref,
            status="completed",
            transfer_code="",
            recipient_code=""
        )
        
        # Credit the wallet
        referral_wallet.add_reward(cls.REFERRAL_REWARD_AMOUNT)
        
        # Update referral record
        referral_obj.reward = cls.REFERRAL_REWARD_AMOUNT
        referral_obj.has_received_reward = True
        referral_obj.reward_transaction = wallet_transaction
        referral_obj.date_rewarded = timezone.now().date()
        referral_obj.save()
        
        return True, f"Successfully credited ₦{cls.REFERRAL_REWARD_AMOUNT}", wallet_transaction


class WithdrawalService:
    """Handle withdrawal requests and processing"""
    
    MINIMUM_WITHDRAWAL = Decimal('1000.00')
    WITHDRAWAL_FEE_PERCENTAGE = Decimal('0.00')  
    FLAT_WITHDRAWAL_FEE = Decimal('0.00') 
    
    @classmethod
    def calculate_withdrawal_fee(cls, amount: Decimal) -> Decimal:
        """Calculate withdrawal fee"""
        percentage_fee = amount * cls.WITHDRAWAL_FEE_PERCENTAGE
        total_fee = percentage_fee + cls.FLAT_WITHDRAWAL_FEE
        return total_fee.quantize(Decimal('0.01'))
    
    @classmethod
    @transaction.atomic
    def create_withdrawal_request(
        cls, 
        talent_profile: TalentProfile, 
        amount: Decimal
    ) -> Tuple[bool, str, Optional[WithdrawalRequest]]:
        """
        Create a new withdrawal request
        
        Returns:
            Tuple of (success: bool, message: str, withdrawal_request: WithdrawalRequest or None)
        """
        # Validate bank details exist
        if not talent_profile.account_number or not talent_profile.bank_name:
            return False, "Bank details not found. Please add bank details to your profile first", None
        
        # Get or create referral wallet
        try:
            referral_wallet = ReferralWallet.objects.get(talent=talent_profile)
        except ReferralWallet.DoesNotExist:
            # Create wallet if it doesn't exist
            referral_wallet = ReferralWallet.objects.create(talent=talent_profile)
        
        # Validate minimum amount
        if amount < cls.MINIMUM_WITHDRAWAL:
            return False, f"Minimum withdrawal is ₦{cls.MINIMUM_WITHDRAWAL}", None
        
        # Check balance
        if not referral_wallet.can_withdraw(amount):
            return False, f"Insufficient balance. Available: ₦{referral_wallet.balance}", None
        
        # Calculate fee
        fee = cls.calculate_withdrawal_fee(amount)
        net_amount = amount - fee
        
        # Check if there's a pending withdrawal
        pending_withdrawal = WithdrawalRequest.objects.filter(
            talent=talent_profile,
            status__in=['pending', 'processing']
        ).exists()
        
        if pending_withdrawal:
            return False, "You have a pending withdrawal request", None
        
        # Create withdrawal request
        withdrawal = WithdrawalRequest.objects.create(
            talent=talent_profile,
            referral_wallet=referral_wallet,
            amount=amount,
            fee=fee,
            net_amount=net_amount,
            status='pending'
        )
        
        # Deduct from wallet (lock the amount)
        referral_wallet.deduct_withdrawal(amount)
        
        # Create transaction record
        txn_ref = f"WTH-{withdrawal.reference}"
        
        WalletTransaction.objects.create(
            user=talent_profile.user,
            referral_withdrawal=referral_wallet,
            withdrawal_request=withdrawal,
            amount=amount,
            tiaago_fees=fee,
            transaction_type=WalletTransaction.TRANSACTION_TYPE.TALENT_REFERRAL_WITHDRAWAL,
            ref=txn_ref,
            recipient_code=talent_profile.recipient_code or "",
            status='pending',
            transfer_code=""
        )
        
        return True, "Withdrawal request created successfully", withdrawal
    
    @classmethod
    @transaction.atomic
    def approve_withdrawal(cls, withdrawal: WithdrawalRequest, admin_user) -> Tuple[bool, str]:
        """
        Approve withdrawal request (manual approval before automation)
        
        This is where you'll later integrate Paystack transfer
        """
        if withdrawal.status != 'pending':
            return False, f"Cannot approve withdrawal with status: {withdrawal.status}"
        
        # Update withdrawal status
        withdrawal.approve(admin_user)
        
        # Update related transaction
        WalletTransaction.objects.filter(
            withdrawal_request=withdrawal
        ).update(status='processing')
        
        # TODO: In the future, integrate Paystack transfer here
        # For now, admin will manually transfer and mark as completed
        
        return True, "Withdrawal approved and ready for processing"
    
    @classmethod
    @transaction.atomic
    def complete_withdrawal(cls, withdrawal: WithdrawalRequest, transfer_code: str = None) -> Tuple[bool, str]:
        """
        Mark withdrawal as completed (after bank transfer is done)
        """
        if withdrawal.status not in ['processing', 'pending']:
            return False, f"Cannot complete withdrawal with status: {withdrawal.status}"
        
        # Update withdrawal
        withdrawal.complete(transfer_code)
        
        # Update transaction
        WalletTransaction.objects.filter(
            withdrawal_request=withdrawal
        ).update(
            status='completed',
            transfer_code=transfer_code or ''
        )
        
        return True, "Withdrawal completed successfully"
    
    @classmethod
    @transaction.atomic
    def fail_withdrawal(cls, withdrawal: WithdrawalRequest, reason: str) -> Tuple[bool, str]:
        """
        Mark withdrawal as failed and refund to wallet
        """
        if withdrawal.status == 'completed':
            return False, "Cannot fail a completed withdrawal"
        
        # Use the model's fail method which handles refund
        withdrawal.fail(reason)
        
        # Update transaction
        WalletTransaction.objects.filter(
            withdrawal_request=withdrawal
        ).update(status='failed')
        
        return True, f"Withdrawal failed and ₦{withdrawal.amount} refunded to wallet"