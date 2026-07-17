"use client";
import { useState, useEffect } from "react";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Info,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Recruiter,
  SubscriptionPlanV3,
  SubscriptionTransaction,
  SubscriptionUsage,
  WalletTransaction,
  WalletUsage,
} from "@/app/common/types";
import { cn, formatPrice, handleFormSubmissionError } from "@/app/common/utils";
import {
  fundWallet,
  subscribeToFreePlan,
  subscribeToPaystackPlan,
  subscribeToStripePlan,
} from "@/app/common/services/subscription";
import { useAlert } from "@/app/common/store/useAlert";
import { BASE_URL } from "@/app/common/constants";
import { useRouter } from "next/navigation";

type TabType = "usage" | "subscription";
type Currency = "USD" | "EUR" | "NGN";
type BillingModel = "usage" | "subscription";

interface AutoRecharge {
  id: string;
  amount: number;
  threshold: number;
  card_last4: string;
  card_brand: string;
  enabled: boolean;
}

interface MonthlyUsage {
  month: string;
  amount: number;
  resume_screenings: number;
  assessments: number;
}

const FUNDING_AMOUNTS = [10, 25, 50, 100, 250, 500];
const NGN_FUNDING_AMOUNTS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000];
const EUR_FUNDING_AMOUNTS = FUNDING_AMOUNTS;
const USD_FUNDING_AMOUNTS = FUNDING_AMOUNTS;

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    resumeScreenings: 20,
    assessments: 10,
  },
  basic: {
    name: "Starter",
    price: 49,
    resumeScreenings: 1000,
    assessments: 200,
  },
  pro: {
    name: "Pro",
    price: 149,
    resumeScreenings: 2000,
    assessments: 400,
  },
};

const MOCK_MONTHLY_USAGE: MonthlyUsage[] = [
  { month: "January", amount: 245, resume_screenings: 145, assessments: 38 },
  { month: "February", amount: 312, resume_screenings: 178, assessments: 45 },
  { month: "March", amount: 198, resume_screenings: 112, assessments: 29 },
  { month: "April", amount: 425, resume_screenings: 234, assessments: 67 },
  { month: "May", amount: 389, resume_screenings: 201, assessments: 54 },
  { month: "June", amount: 467, resume_screenings: 267, assessments: 72 },
];

interface UserBillingProps {
  triggerBillingSetup?: boolean;
  onBillingSetupComplete?: () => void;
  subscriptionPlans: SubscriptionPlanV3[];
  currentUser: Recruiter;
  walletBalance: {
    balance: number;
    currency: string;
  } | null;
  walletTransactions: WalletTransaction[];
  subscriptionTransactions: SubscriptionTransaction[];
  subscriptionUsage: SubscriptionUsage | null;
  walletUsage: WalletUsage | null;
}

const UserBilling = ({
  triggerBillingSetup,
  onBillingSetupComplete,
  subscriptionPlans,
  currentUser,
  walletBalance,
  walletTransactions,
  subscriptionTransactions,
  subscriptionUsage,
  walletUsage,
}: UserBillingProps) => {
  const router = useRouter();
  const isNigerian = currentUser.country.toLowerCase() === "nigeria";
  const [activeTab, setActiveTab] = useState<TabType>(
    currentUser.billing_type === "subscription" ? "subscription" : "usage"
  );
  const currency: Currency = isNigerian ? "NGN" : "USD";
  const walletData = {
    balance: walletBalance?.balance || 0,
    total_funded: 0,
    currency: walletBalance
      ? (walletBalance?.currency as Currency)
      : isNigerian
        ? "NGN"
        : "USD",
  };
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedProvider] = useState<"paystack" | "stripe" | null>(
    isNigerian ? "paystack" : "stripe"
  );
  const [fundCurrency, setFundCurrency] = useState<Currency>(currency);
  const [autoRecharge, setAutoRecharge] = useState<AutoRecharge | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditAutoRecharge, setShowEditAutoRecharge] = useState(false);
  const [editAmount, setEditAmount] = useState(50);
  const [editThreshold, setEditThreshold] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(5);
  const [currentBillingModel, setCurrentBillingModel] = useState<BillingModel>(
    currentUser.billing_type === "subscription" ? "subscription" : "usage"
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "monthly"
  );
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchTarget, setSwitchTarget] =
    useState<BillingModel>("subscription");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [newAutoRechargeAmount, setNewAutoRechargeAmount] = useState(50);
  const [newAutoRechargeThreshold, setNewAutoRechargeThreshold] = useState(10);
  const [showAutoRechargeSetup, setShowAutoRechargeSetup] = useState(false);
  const [showBillingModelPrompt, setShowBillingModelPrompt] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

  const setAlert = useAlert(s => s.setAlert);

  useEffect(() => {
    const hasSelectedBillingModel = localStorage.getItem(
      "billingModelSelected"
    );
    if (!hasSelectedBillingModel) {
      setTimeout(() => setShowBillingModelPrompt(true), 0);
    }

    const storedActiveTab = localStorage.getItem("billingModel");
    if (storedActiveTab === "usage" || storedActiveTab === "subscription") {
      setTimeout(() => {
        setActiveTab(storedActiveTab);
        setCurrentBillingModel(storedActiveTab);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (triggerBillingSetup) {
      setTimeout(() => setShowBillingModelPrompt(true), 0);
    }
  }, [triggerBillingSetup]);

  const handleFundWallet = (amount: number) => {
    setSelectedAmount(amount);
  };

  const handleProceedToPayment = async () => {
    if (!selectedAmount || !selectedProvider) {
      toast.error("Please select an amount and payment provider");
      return;
    }
    setIsFunding(true);
    const response = await fundWallet(selectedAmount, selectedProvider);
    if (
      response.success &&
      (response.data?.checkout_url || response.data?.authorization_url)
    ) {
      window.location.assign(
        response.data.checkout_url || response.data.authorization_url
      );
    } else {
      // console.log("response", response);
      handleFormSubmissionError(
        response.error || "Failed to fund wallet",
        undefined,
        setAlert
      );
    }
    setIsFunding(false);
  };

  const handlePlanChange = (newPlan: string) => {
    toast.info(
      `Plan change to ${newPlan} would trigger subscription update logic`
    );
  };

  const handleDeleteAutoRecharge = () => {
    setAutoRecharge(null);
    setShowDeleteModal(false);
    toast.success("Auto-recharge disabled successfully");
  };

  const handleSaveAutoRecharge = () => {
    if (autoRecharge) {
      setAutoRecharge({
        ...autoRecharge,
        amount: editAmount,
        threshold: editThreshold,
      });
    }
    setShowEditAutoRecharge(false);
    toast.success("Auto-recharge settings updated");
  };

  const handleSwitchBillingModel = (target: BillingModel) => {
    setSwitchTarget(target);
    setShowSwitchModal(true);
  };

  const confirmSwitchBillingModel = () => {
    setCurrentBillingModel(switchTarget);
    setActiveTab(switchTarget);
    setShowSwitchModal(false);
    localStorage.setItem("billingModel", switchTarget);
    // toast.success(
    //   `Successfully switched to ${
    //     switchTarget === "usage" ? "Usage-Based" : "Subscription"
    //   } billing`
    // );
  };

  const handleSelectBillingModel = (model: BillingModel) => {
    setCurrentBillingModel(model);
    setActiveTab(model);
    setIsNewUser(false);
    setShowBillingModelPrompt(false);
    localStorage.setItem("billingModelSelected", "true");
    localStorage.setItem("billingModel", model);
    if (onBillingSetupComplete) {
      onBillingSetupComplete();
    }
  };

  const handleSetupAutoRecharge = () => {
    if (!cardNumber || !cardName || !expiryDate || !cvv) {
      toast.warning("Please fill in all card details");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast.warning("Please enter a valid 16-digit card number");
      return;
    }
    if (cvv.length !== 3) {
      toast.warning("Please enter a valid 3-digit CVV");
      return;
    }

    const last4 = cardNumber.replace(/\s/g, "").slice(-4);
    let cardBrand = "Visa";
    if (cardNumber.startsWith("5")) cardBrand = "Mastercard";
    if (cardNumber.startsWith("34") || cardNumber.startsWith("37"))
      cardBrand = "Amex";

    setAutoRecharge({
      id: "1",
      amount: newAutoRechargeAmount,
      threshold: newAutoRechargeThreshold,
      card_last4: last4,
      card_brand: cardBrand,
      enabled: true,
    });
    setShowAutoRechargeSetup(false);
    setCardNumber("");
    setCardName("");
    setExpiryDate("");
    setCvv("");
    toast.success("Auto-recharge enabled successfully");
  };

  const handleSubscribeToPlan = async (plan_code: string) => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    if (isNigerian) {
      toast.loading("Processing...");
      const res = await subscribeToPaystackPlan(plan_code);
      if (res.success && res.data) {
        window.open(res.data.data.authorization_url, "_blank");
      } else {
        handleFormSubmissionError(res.error, undefined, setAlert);
      }
      setIsSubscribing(false);
      toast.dismiss();
    } else {
      toast.loading("Processing...");
      const res = await subscribeToStripePlan(
        plan_code,
        `${BASE_URL}/recruiter/dashboard/billing`
      );
      if (res.success && res.data?.data?.checkout_url) {
        window.location.assign(res.data.data.checkout_url);
      } else {
        handleFormSubmissionError(res.error, undefined, setAlert);
      }
      setIsSubscribing(false);
      toast.dismiss();
    }
  };

  const handleSubscribeTofreePlan = async () => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    toast.loading("Processing...");
    const res = await subscribeToFreePlan();
    if (res.success) {
      toast.dismiss();
      toast.success("You have successfully downgraded to our free plan");
      router.refresh();
    } else {
      handleFormSubmissionError(res.error, undefined, setAlert);
    }
    setIsSubscribing(false);
    toast.dismiss();
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(" ") : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number, curr: Currency = currency) => {
    return formatPrice({
      price: amount,
      currencyCode: curr,
    });
  };

  const currentMonthData = {
    resume_screenings: walletUsage?.resumes_used || 0,
    assessments: walletUsage?.assessments_used || 0,
    amount: walletUsage?.total_amount_spent || 0,
  };
  const totalUsage =
    currentMonthData.resume_screenings + currentMonthData.assessments;
  const screeningsPercentage =
    totalUsage > 0
      ? (currentMonthData.resume_screenings / totalUsage) * 100
      : 0;
  const assessmentsPercentage =
    totalUsage > 0 ? (currentMonthData.assessments / totalUsage) * 100 : 0;

  const displayWalletData = {
    balance: walletUsage?.wallet_balance || 0,
    total_funded: 0,
    currency,
  };

  const latestSubscriptionTransaction =
    subscriptionTransactions
      ?.filter(txn => txn.status === "succeeded" || txn.status === "success")
      .sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      )[0] || null;

  return (
    <div>
      {/* <button
        onClick={() => setShowEmptyState(prev => !prev)}
        className='mb-4 px-4 py-2 bg-gray-200 rounded-lg'
      >
        {showEmptyState ? "Load Data" : "Show Empty State"}
      </button> */}
      <div className='flex gap-4 sm:gap-8 border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto'>
        {currentBillingModel === "usage" && (
          <button
            onClick={() => setActiveTab("usage")}
            className={`pb-3 sm:pb-4 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === "usage"
                ? "text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Usage Based
            {activeTab === "usage" && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600'></div>
            )}
          </button>
        )}
        {currentBillingModel === "subscription" && (
          <button
            onClick={() => setActiveTab("subscription")}
            className={`pb-3 sm:pb-4 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === "subscription"
                ? "text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Subscription
            {activeTab === "subscription" && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600' />
            )}
          </button>
        )}
      </div>

      {activeTab === "usage" ? (
        <div>
          <div className='mb-4 sm:mb-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4'>
              <div>
                <h1 className='text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2'>
                  Wallet Balance
                </h1>
                <p className='text-sm sm:text-base text-gray-600'>
                  Fund your wallet and pay as you go for services.
                </p>
              </div>
              {/* <div className='flex items-center gap-2 sm:gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs sm:text-sm text-gray-600'>
                    Currency:
                  </span>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                    className='px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value='USD'>USD ($)</option>
                    <option value='EUR'>EUR (€)</option>
                    <option value='NGN'>NGN (₦)</option>
                  </select>
                </div>
              </div> */}
            </div>
            {currentBillingModel === "usage" && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start gap-3 sm:justify-between'>
                <div className='flex items-start gap-3'>
                  <Info
                    size={18}
                    className='text-blue-600 mt-0.5 flex-shrink-0 sm:w-5 sm:h-5'
                  />
                  <div>
                    <h3 className='text-xs sm:text-sm font-semibold text-gray-900 mb-1'>
                      Currently on Usage-Based Billing
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600'>
                      Pay only for what you use. Want predictable monthly costs?
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSwitchBillingModel("subscription")}
                  className='flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap w-full sm:w-auto justify-center'
                >
                  <ArrowLeftRight size={16} />
                  Switch to Subscription
                </button>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6'>
            <div className='bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-4 sm:p-5 text-white'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-xs sm:text-sm font-medium opacity-90'>
                  Wallet Balance
                </span>
                <Info
                  size={16}
                  className='opacity-75 sm:w-[18px] sm:h-[18px]'
                />
              </div>
              <div className='mb-4'>
                <div className='text-3xl sm:text-4xl font-bold mb-1'>
                  {formatCurrency(
                    displayWalletData.balance,
                    displayWalletData.currency
                  )}
                  <span className='text-base sm:text-lg font-normal ml-2 opacity-75'>
                    {displayWalletData.currency}
                  </span>
                </div>
                <div className='text-xs sm:text-sm opacity-75'>Available</div>
              </div>
              <button
                onClick={() => setShowFundModal(true)}
                className='w-full bg-white text-indigo-600 font-medium py-2 sm:py-2.5 text-sm sm:text-base rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2'
              >
                <CreditCard size={18} />
                Fund Wallet
              </button>
            </div>

            {autoRecharge ? (
              <div className='bg-white border border-gray-200 rounded-xl p-5'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Auto-Recharge
                  </h3>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => {
                        setEditAmount(autoRecharge.amount);
                        setEditThreshold(autoRecharge.threshold);
                        setShowEditAutoRecharge(true);
                      }}
                      className='p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className='space-y-4'>
                  <div className='flex items-center justify-between py-3 border-b border-gray-100'>
                    <span className='text-sm text-gray-600'>
                      Recharge Amount
                    </span>
                    <span className='text-lg font-semibold text-gray-900'>
                      {formatCurrency(autoRecharge.amount)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between py-3 border-b border-gray-100'>
                    <span className='text-sm text-gray-600'>
                      When Balance Falls Below
                    </span>
                    <span className='text-lg font-semibold text-gray-900'>
                      {formatCurrency(autoRecharge.threshold)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between py-3'>
                    <span className='text-sm text-gray-600'>
                      Payment Method
                    </span>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium text-gray-900'>
                        {autoRecharge.card_brand}
                      </span>
                      <span className='text-sm text-gray-600'>
                        •••• {autoRecharge.card_last4}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2'>
                  <div className='w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                    <span className='text-green-600 text-xs'>✓</span>
                  </div>
                  <p className='text-sm text-green-700'>
                    Your wallet will automatically recharge when balance drops
                    below {formatCurrency(autoRecharge.threshold)}
                  </p>
                </div>
              </div>
            ) : (
              <div className='bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center'>
                <CreditCard size={48} className='text-gray-400 mb-3' />
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Enable Auto-Recharge
                </h3>
                <p className='text-sm text-gray-600 text-center mb-4'>
                  Never run out of balance. Set up automatic recharges.
                </p>
                <button
                  onClick={() => setShowAutoRechargeSetup(true)}
                  className='px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                >
                  Set Up Auto-Recharge
                </button>
              </div>
            )}
          </div>

          <div className='bg-white rounded-xl border border-gray-200 mb-6'>
            <div className='px-6 py-4 border-b border-gray-200'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <BarChart3 size={20} className='text-indigo-600' />
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Monthly Usage Overview
                  </h2>
                </div>
                {/* <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className='px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                >
                  {MOCK_MONTHLY_USAGE.map((month, index) => (
                    <option key={month.month} value={index}>
                      {month.month}
                    </option>
                  ))}
                </select> */}
              </div>
            </div>
            <div className='p-6'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                <div className='flex items-center justify-center py-4'>
                  <div
                    className='relative'
                    style={{ width: "240px", height: "240px" }}
                  >
                    <svg
                      viewBox='0 0 200 200'
                      className='w-full h-full'
                      style={{
                        filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05))",
                      }}
                    >
                      <defs>
                        <linearGradient
                          id='screeningGrad'
                          x1='0%'
                          y1='0%'
                          x2='100%'
                          y2='100%'
                        >
                          <stop
                            offset='0%'
                            stopColor='#6366F1'
                            stopOpacity='1'
                          />
                          <stop
                            offset='100%'
                            stopColor='#4F46E5'
                            stopOpacity='1'
                          />
                        </linearGradient>
                        <linearGradient
                          id='assessmentGrad'
                          x1='0%'
                          y1='0%'
                          x2='100%'
                          y2='100%'
                        >
                          <stop
                            offset='0%'
                            stopColor='#10B981'
                            stopOpacity='1'
                          />
                          <stop
                            offset='100%'
                            stopColor='#059669'
                            stopOpacity='1'
                          />
                        </linearGradient>
                      </defs>
                      <g transform='rotate(-90 100 100)'>
                        <circle
                          cx='100'
                          cy='100'
                          r='75'
                          fill='none'
                          stroke='#F3F4F6'
                          strokeWidth='22'
                        />
                        <circle
                          cx='100'
                          cy='100'
                          r='75'
                          fill='none'
                          stroke='url(#screeningGrad)'
                          strokeWidth='22'
                          strokeDasharray={`${
                            (screeningsPercentage / 100) * 471.24
                          } 471.24`}
                          strokeLinecap='round'
                          className={cn(
                            "transition-all duration-1000 ease-in-out",
                            !screeningsPercentage && "hidden"
                          )}
                          style={{
                            filter:
                              "drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))",
                          }}
                        />
                        <circle
                          cx='100'
                          cy='100'
                          r='75'
                          fill='none'
                          stroke='url(#assessmentGrad)'
                          strokeWidth='22'
                          strokeDasharray={`${
                            (assessmentsPercentage / 100) * 471.24
                          } 471.24`}
                          strokeDashoffset={`-${
                            (screeningsPercentage / 100) * 471.24
                          }`}
                          strokeLinecap='round'
                          className={cn(
                            "transition-all duration-1000 ease-in-out",
                            !assessmentsPercentage && "hidden"
                          )}
                          style={{
                            filter:
                              "drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))",
                          }}
                        />
                      </g>
                    </svg>
                    <div className='absolute inset-0 flex flex-col items-center justify-center'>
                      <div className='text-5xl font-bold bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 bg-clip-text text-transparent'>
                        {totalUsage}
                      </div>
                      <div className='text-xs font-semibold text-gray-500 mt-2 tracking-wide uppercase'>
                        Total Usage
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex flex-col justify-center space-y-6'>
                  <div>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm'></div>
                        <span className='text-sm font-medium text-gray-700'>
                          Resume Screenings
                        </span>
                      </div>
                      <span className='text-lg font-bold text-gray-900'>
                        {currentMonthData.resume_screenings}
                      </span>
                    </div>
                    <div className='bg-gray-100 rounded-full h-2.5 overflow-hidden'>
                      <div
                        className='bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm'
                        style={{ width: `${screeningsPercentage}%` }}
                      ></div>
                    </div>
                    <div className='mt-2 text-xs font-medium text-gray-500'>
                      {screeningsPercentage.toFixed(1)}% of total
                    </div>
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-sm'></div>
                        <span className='text-sm font-medium text-gray-700'>
                          Assessments
                        </span>
                      </div>
                      <span className='text-lg font-bold text-gray-900'>
                        {currentMonthData.assessments}
                      </span>
                    </div>
                    <div className='bg-gray-100 rounded-full h-2.5 overflow-hidden'>
                      <div
                        className='bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm'
                        style={{ width: `${assessmentsPercentage}%` }}
                      ></div>
                    </div>
                    <div className='mt-2 text-xs font-medium text-gray-500'>
                      {assessmentsPercentage.toFixed(1)}% of total
                    </div>
                  </div>

                  <div className='pt-5 mt-2 border-t border-gray-200'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-semibold text-gray-600 uppercase tracking-wide'>
                        Amount Spent
                      </span>
                      <span className='text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent'>
                        {formatCurrency(currentMonthData.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200'>
            <div className='px-6 py-4 border-b border-gray-200'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Transaction History
              </h2>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Date
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Reference
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Type
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Amount
                    </th>
                    <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {showEmptyState || walletTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className='px-6 py-12'>
                        <div className='flex flex-col items-center justify-center text-center'>
                          <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                            <DollarSign size={32} className='text-gray-400' />
                          </div>
                          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                            No Transactions Yet
                          </h3>
                          <p className='text-sm text-gray-600 mb-4 max-w-sm'>
                            Your transaction history will appear here once you
                            start using services or funding your wallet.
                          </p>
                          <button
                            onClick={() => setShowFundModal(true)}
                            className='px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                          >
                            Fund Wallet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    walletTransactions.map(transaction => (
                      <tr key={transaction.id} className='hover:bg-gray-50'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className='px-6 py-4 text-sm text-gray-900'>
                          {transaction.reference}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm'>
                          <span
                            className={`inline-flex items-center gap-1 ${
                              transaction.transaction_type === "credit"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            <TrendingUp
                              size={16}
                              className={
                                transaction.transaction_type === "debit"
                                  ? "rotate-180"
                                  : ""
                              }
                            />
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900'>
                          {formatPrice({
                            price: +transaction.amount,
                            currencyCode: transaction.currency,
                          })}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-center'>
                          <span className='inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700'>
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showFundModal && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
              <div className='bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative'>
                <button
                  onClick={() => {
                    setShowFundModal(false);
                    setSelectedAmount(null);
                    // setSelectedProvider(null);
                    // setFundCurrency("USD");
                  }}
                  className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors'
                >
                  <X size={24} />
                </button>

                <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                  Fund Wallet
                </h2>
                <p className='text-gray-600 mb-6'>
                  Select amount and payment method
                </p>

                {/* <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 mb-3'>
                    Currency
                  </label>
                  <select
                    value={fundCurrency}
                    onChange={e => setFundCurrency(e.target.value as Currency)}
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value='USD'>USD - US Dollar ($)</option>
                    <option value='EUR'>EUR - Euro (€)</option>
                    <option value='NGN'>NGN - Nigerian Naira (₦)</option>
                  </select>
                </div> */}

                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 mb-3'>
                    Select Amount
                  </label>
                  <div className='grid grid-cols-3 gap-3'>
                    {(fundCurrency === "NGN"
                      ? NGN_FUNDING_AMOUNTS
                      : fundCurrency === "EUR"
                        ? EUR_FUNDING_AMOUNTS
                        : USD_FUNDING_AMOUNTS
                    ).map(amount => (
                      <button
                        key={amount}
                        onClick={() => handleFundWallet(amount)}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${
                          selectedAmount === amount
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className='text-xl font-bold text-gray-900'>
                          {formatPrice({
                            price: amount,
                            currencyCode: fundCurrency,
                            noOfDigits: 0,
                            // makeFriendly: true,
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 mb-3'>
                    Payment Provider
                  </label>
                  <div className='grid grid-cols-2 gap-3'>
                    <button
                      onClick={() => setSelectedProvider("paystack")}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        selectedProvider === "paystack"
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className='flex items-center justify-center gap-2'>
                        <div className='w-8 h-8 bg-blue-600 rounded flex items-center justify-center'>
                          <span className='text-white font-bold text-xs'>
                            P
                          </span>
                        </div>
                        <span className='font-semibold text-gray-900'>
                          Paystack
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedProvider("stripe")}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        selectedProvider === "stripe"
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className='flex items-center justify-center gap-2'>
                        <div className='w-8 h-8 bg-purple-600 rounded flex items-center justify-center'>
                          <span className='text-white font-bold text-xs'>
                            S
                          </span>
                        </div>
                        <span className='font-semibold text-gray-900'>
                          Stripe
                        </span>
                      </div>
                    </button>
                  </div>
                </div> */}

                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedAmount || !selectedProvider || isFunding}
                  className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedAmount && selectedProvider
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <CreditCard size={20} />
                  {isFunding
                    ? "Processing..."
                    : selectedAmount
                      ? `Pay ${formatPrice({
                          price: selectedAmount,
                          currencyCode: fundCurrency,
                        })}`
                      : "Select amount"}
                </button>
              </div>
            </div>
          )}

          {showDeleteModal && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
              <div className='bg-white rounded-2xl p-8 max-w-md w-full mx-4'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
                    <AlertCircle size={24} className='text-red-600' />
                  </div>
                  <h2 className='text-xl font-bold text-gray-900'>
                    Disable Auto-Recharge?
                  </h2>
                </div>
                <p className='text-gray-600 mb-6'>
                  Disabling auto-recharge means your balance will no longer be
                  topped up automatically. When it runs out, your services will
                  go down. Are you sure you want to proceed?
                </p>
                <div className='flex gap-3'>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className='flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAutoRecharge}
                    className='flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors'
                  >
                    Yes, Disable
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEditAutoRecharge && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
              <div className='bg-white rounded-2xl p-8 max-w-md w-full mx-4'>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                  Edit Auto-Recharge
                </h2>
                <p className='text-gray-600 mb-6'>
                  Update your auto-recharge settings
                </p>

                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Recharge Amount ({currency})
                  </label>
                  <input
                    type='number'
                    value={editAmount}
                    onChange={e => setEditAmount(Number(e.target.value))}
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    min='10'
                  />
                </div>

                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Trigger When Balance Falls Below ({currency})
                  </label>
                  <input
                    type='number'
                    value={editThreshold}
                    onChange={e => setEditThreshold(Number(e.target.value))}
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    min='1'
                  />
                </div>

                <div className='flex gap-3'>
                  <button
                    onClick={() => setShowEditAutoRecharge(false)}
                    className='flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAutoRecharge}
                    className='flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className='mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 mb-2'>
              Subscription Plans
            </h1>
            <p className='text-gray-600'>
              Choose a plan that fits your hiring needs.
            </p>
          </div>

          {!!currentUser.subscription && (
            <div className='bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6'>
              <div className='flex items-start justify-between mb-4'>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 mb-1'>
                    Current Plan: {currentUser.subscription.plan}
                  </h3>
                  {!!latestSubscriptionTransaction?.next_payment_date && (
                    <p className='text-sm text-gray-600'>
                      Your plan renews on{" "}
                      {formatDate(
                        latestSubscriptionTransaction?.next_payment_date
                      )}
                    </p>
                  )}
                </div>
                {currentUser.subscription.plan.toLowerCase() !== "free" && (
                  <div className='text-right'>
                    <div className='text-2xl font-bold text-gray-900'>
                      {formatPrice({
                        price:
                          subscriptionPlans.find(
                            plan =>
                              plan.name.toLowerCase() ===
                                currentUser.subscription.plan.toLowerCase() &&
                              plan.interval === "monthly"
                          )?.amount || 0,
                        divisor: 100,
                        currencyCode: currency,
                        // currentUser.subscription.provider === "paystack"
                        //   ? "NGN"
                        //   : "USD",
                      })}
                    </div>
                    <div className='text-sm text-gray-600'>per month</div>
                  </div>
                )}
              </div>

              <div className='grid grid-cols-2 gap-4 mt-6'>
                <div className='bg-white rounded-lg p-4'>
                  <div className='text-sm text-gray-600 mb-1'>
                    Resume Screenings
                  </div>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-2xl font-bold text-gray-900'>
                      {currentUser.subscription.resume_limit -
                        (subscriptionUsage?.resumes_used || 0)}
                    </span>
                    <span className='text-sm text-gray-500'>
                      / {currentUser.subscription.resume_limit} left
                    </span>
                  </div>
                  <div className='mt-2 bg-gray-200 rounded-full h-2'>
                    <div
                      className='bg-indigo-600 h-2 rounded-full transition-all'
                      style={{
                        width: `${
                          ((currentUser.subscription.resume_limit -
                            (subscriptionUsage?.resumes_used || 0)) /
                            currentUser.subscription.resume_limit) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className='bg-white rounded-lg p-4'>
                  <div className='text-sm text-gray-600 mb-1'>Assessments</div>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-2xl font-bold text-gray-900'>
                      {currentUser.subscription.assessment_limit -
                        (subscriptionUsage?.assessments_used || 0)}
                    </span>
                    <span className='text-sm text-gray-500'>
                      / {currentUser.subscription.assessment_limit} left
                    </span>
                  </div>
                  <div className='mt-2 bg-gray-200 rounded-full h-2'>
                    <div
                      className='bg-indigo-600 h-2 rounded-full transition-all'
                      style={{
                        width: `${
                          ((currentUser.subscription.assessment_limit -
                            (subscriptionUsage?.assessments_used || 0)) /
                            currentUser.subscription.assessment_limit) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentBillingModel === "subscription" && (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-start justify-between mb-6'>
              <div className='flex items-start gap-3'>
                <Info
                  size={20}
                  className='text-green-600 mt-0.5 flex-shrink-0'
                />
                <div>
                  <h3 className='text-sm font-semibold text-gray-900 mb-1'>
                    Currently on Subscription Billing
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Enjoy predictable monthly costs. Need more flexibility?
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSwitchBillingModel("usage")}
                className='flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap'
              >
                <ArrowLeftRight size={16} />
                Switch to Usage-Based
              </button>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div className='flex justify-center'>
            <div className='inline-flex items-center bg-white rounded-full p-1 shadow-lg border border-gray-200 mb-8'>
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex items-center px-6 py-3 rounded-full font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annually")}
                className={`flex items-center px-6 py-3 rounded-full font-medium transition-all ${
                  billingCycle === "annually"
                    ? "bg-primary text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Yearly
                <span className='ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full'>
                  2 months free
                </span>
              </button>
            </div>
          </div>

          <div className='grid grid-cols-3 gap-6 mb-6'>
            {Object.entries(PLANS).map(([key, plan]) => {
              const isFree = key === "free";
              const isPro = key === "pro";
              const relatedServerPlan = subscriptionPlans.find(
                p =>
                  p.name.toLowerCase() === plan.name.toLowerCase() &&
                  (billingCycle === p.interval.toLowerCase() ||
                    (billingCycle === "annually" &&
                      p.interval.toLowerCase() === "yearly"))
              );
              if (!relatedServerPlan && !isFree) return null;
              const isCurrentPlan =
                currentUser.subscription?.plan.toLowerCase() ===
                (relatedServerPlan?.name.toLowerCase() || "free");

              return (
                <div
                  key={key}
                  className={`bg-white rounded-xl border-2 p-6 transition-all ${
                    isCurrentPlan
                      ? "border-indigo-600 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {isCurrentPlan && (
                    <div className='bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full inline-block mb-4'>
                      Current Plan
                    </div>
                  )}
                  <h3 className='text-xl font-bold text-gray-900 mb-2'>
                    {plan.name}
                  </h3>
                  <div className='mb-6'>
                    <span className='text-4xl font-bold text-gray-900'>
                      {formatPrice({
                        price: relatedServerPlan?.amount || 0,
                        // divisor: 100,
                        noOfDigits: 0,
                        currencyCode: relatedServerPlan?.currency || currency,
                      })}
                    </span>
                    {!isFree && (
                      <span className='text-gray-600 ml-2'>
                        / {billingCycle === "annually" ? "year" : "month"}
                      </span>
                    )}
                  </div>

                  <div className='space-y-3 mb-6'>
                    <div className='flex items-center gap-2 text-sm text-gray-700'>
                      <div className='w-5 h-5 bg-green-100 rounded-full flex items-center justify-center'>
                        <span className='text-green-600 text-xs'>✓</span>
                      </div>
                      {plan.resumeScreenings.toLocaleString()} Resume Screenings
                    </div>
                    <div className='flex items-center gap-2 text-sm text-gray-700'>
                      <div className='w-5 h-5 bg-green-100 rounded-full flex items-center justify-center'>
                        <span className='text-green-600 text-xs'>✓</span>
                      </div>
                      {plan.assessments} Assessments
                    </div>
                  </div>

                  <button
                    // onClick={() => !isCurrentPlan && handlePlanChange(key)}
                    onClick={() =>
                      relatedServerPlan && !isFree
                        ? handleSubscribeToPlan(relatedServerPlan.plan_code)
                        : handleSubscribeTofreePlan()
                    }
                    disabled={isCurrentPlan || isSubscribing}
                    className={cn(
                      "w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                      isCurrentPlan
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : isFree
                          ? "bg-gray-900 text-white hover:bg-gray-800"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                    )}
                  >
                    {isCurrentPlan
                      ? "Current Plan"
                      : isFree
                        ? currentUser.subscription
                          ? "Downgrade to Free"
                          : "Subscribe for free"
                        : isPro
                          ? "Upgrade to Pro"
                          : "Select Plan"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className='bg-white rounded-xl border border-gray-200'>
            <div className='px-6 py-4 border-b border-gray-200'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Billing History
              </h2>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Date
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Plan
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Amount
                    </th>
                    <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {subscriptionTransactions.map(bill => (
                    <tr key={bill.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                        {formatDate(bill.paid_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize'>
                        {bill.plan_name || "N/A"}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900'>
                        {formatPrice({
                          price: bill.amount,
                          divisor: 100,
                          currencyCode:
                            bill.provider === "stripe" ? "USD" : "NGN",
                        })}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-center'>
                        <span className='inline-flex px-2 py-1 text-xs capitalize font-medium rounded-full bg-green-100 text-green-700'>
                          {bill.status === "succeeded"
                            ? "Success"
                            : bill.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-center'>
                        {/* <button className='text-indigo-600 hover:text-indigo-800 text-sm font-medium'>
                          Download
                        </button> */}
                        {bill.reference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAutoRechargeSetup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto'>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Set Up Auto-Recharge
            </h2>
            <p className='text-gray-600 mb-6'>
              Configure automatic wallet recharges to keep your services running
              smoothly
            </p>

            <div className='space-y-4 mb-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Card Number
                </label>
                <input
                  type='text'
                  value={cardNumber}
                  onChange={e => {
                    const formatted = formatCardNumber(
                      e.target.value.replace(/\D/g, "")
                    );
                    if (formatted.replace(/\s/g, "").length <= 16) {
                      setCardNumber(formatted);
                    }
                  }}
                  placeholder='1234 5678 9012 3456'
                  className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  maxLength={19}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Cardholder Name
                </label>
                <input
                  type='text'
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder='John Doe'
                  className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Expiry Date
                  </label>
                  <input
                    type='text'
                    value={expiryDate}
                    onChange={e => {
                      const formatted = formatExpiryDate(e.target.value);
                      if (formatted.length <= 5) {
                        setExpiryDate(formatted);
                      }
                    }}
                    placeholder='MM/YY'
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    CVV
                  </label>
                  <input
                    type='text'
                    value={cvv}
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 3) {
                        setCvv(value);
                      }
                    }}
                    placeholder='123'
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    maxLength={3}
                  />
                </div>
              </div>

              <div className='pt-4 border-t border-gray-200'>
                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Recharge Amount ({currency})
                  </label>
                  <input
                    type='number'
                    value={newAutoRechargeAmount}
                    onChange={e =>
                      setNewAutoRechargeAmount(Number(e.target.value))
                    }
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    min='10'
                    placeholder='50'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    Amount to add when auto-recharge triggers
                  </p>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Trigger When Balance Falls Below ({currency})
                  </label>
                  <input
                    type='number'
                    value={newAutoRechargeThreshold}
                    onChange={e =>
                      setNewAutoRechargeThreshold(Number(e.target.value))
                    }
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    min='1'
                    placeholder='10'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    Wallet will auto-recharge when below this amount
                  </p>
                </div>
              </div>
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowAutoRechargeSetup(false);
                  setCardNumber("");
                  setCardName("");
                  setExpiryDate("");
                  setCvv("");
                  setNewAutoRechargeAmount(50);
                  setNewAutoRechargeThreshold(10);
                }}
                className='flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleSetupAutoRecharge}
                className='flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors'
              >
                Enable Auto-Recharge
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillingModelPrompt && (
        <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-8 max-w-2xl w-full'>
            <h2 className='text-3xl font-bold text-gray-900 mb-2 text-center'>
              Choose Your Billing Model
            </h2>
            <p className='text-gray-600 text-center mb-8'>
              Select how you&apos;d like to pay for your hiring needs
            </p>

            <div className='grid md:grid-cols-2 gap-6'>
              <button
                onClick={() => handleSelectBillingModel("usage")}
                className='bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-xl p-6 text-left transition-all hover:shadow-lg group'
              >
                <div className='w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <DollarSign size={28} className='text-white' />
                </div>
                <h3 className='text-xl font-bold text-gray-900 mb-2'>
                  Usage-Based
                </h3>
                <p className='text-sm text-gray-600 mb-4'>
                  Pay only for what you use. Perfect for flexible hiring needs
                  with no monthly commitment.
                </p>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-indigo-600 rounded-full'></div>
                    Pay per screening & assessment
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-indigo-600 rounded-full'></div>
                    No monthly fees
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-indigo-600 rounded-full'></div>
                    Scale as needed
                  </li>
                </ul>
              </button>

              <button
                onClick={() => handleSelectBillingModel("subscription")}
                className='bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 hover:border-green-400 rounded-xl p-6 text-left transition-all hover:shadow-lg group'
              >
                <div className='w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <TrendingUp size={28} className='text-white' />
                </div>
                <h3 className='text-xl font-bold text-gray-900 mb-2'>
                  Subscription
                </h3>
                <p className='text-sm text-gray-600 mb-4'>
                  Predictable monthly costs with set limits. Ideal for
                  consistent hiring volume.
                </p>
                <ul className='space-y-2 text-sm text-gray-700'>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-600 rounded-full'></div>
                    Fixed monthly price
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-600 rounded-full'></div>
                    Included screenings & assessments
                  </li>
                  <li className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-600 rounded-full'></div>
                    Better value for volume
                  </li>
                </ul>
              </button>
            </div>

            <p className='text-center text-sm text-gray-500 mt-6'>
              You can switch between models anytime
            </p>
          </div>
        </div>
      )}

      {showSwitchModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl p-8 max-w-md w-full mx-4'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center'>
                <ArrowLeftRight size={24} className='text-indigo-600' />
              </div>
              <h2 className='text-xl font-bold text-gray-900'>
                Switch Billing Model?
              </h2>
            </div>

            <p className='text-gray-600 mb-6'>
              {switchTarget === "subscription" ? (
                <>
                  You&apos;re about to switch from{" "}
                  <span className='font-semibold'>Usage-Based</span> to{" "}
                  <span className='font-semibold'>Subscription</span> billing.
                  You&apos;ll enjoy predictable monthly costs with set limits
                  for resume screenings and assessments.
                </>
              ) : (
                <>
                  You&apos;re about to switch from{" "}
                  <span className='font-semibold'>Subscription</span> to{" "}
                  <span className='font-semibold'>Usage-Based</span> billing.
                  You&apos;ll pay only for what you use with no monthly
                  commitment.
                </>
              )}
            </p>

            {/* <div className='mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <p className='text-sm text-yellow-800'>
                <span className='font-semibold'>Note:</span> Changes will take
                effect immediately.
                {switchTarget === "subscription"
                  ? " Any remaining wallet balance will be preserved."
                  : " Your current subscription will be cancelled at the end of the billing period."}
              </p>
            </div> */}

            <div className='flex gap-3'>
              <button
                onClick={() => setShowSwitchModal(false)}
                className='flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitchBillingModel}
                className='flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors'
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBilling;
