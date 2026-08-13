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
  Gift,
  BellRing,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Recruiter, WalletTransaction, WalletUsage } from "@/app/common/types";
import { cn, formatPrice, handleFormSubmissionError } from "@/app/common/utils";
import {
  fundWallet,
  updateWalletSettings,
} from "@/app/common/services/subscription";
import {
  exportWalletTransactionsCsv,
  getWalletTransactionsClient,
} from "@/app/common/services/subscription-client";
import { useAlert } from "@/app/common/store/useAlert";

type Currency = "USD" | "EUR" | "NGN";

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
const NGN_FUNDING_AMOUNTS = [100, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000];
const EUR_FUNDING_AMOUNTS = FUNDING_AMOUNTS;
const USD_FUNDING_AMOUNTS = FUNDING_AMOUNTS;

const MOCK_MONTHLY_USAGE: MonthlyUsage[] = [
  { month: "January", amount: 245, resume_screenings: 145, assessments: 38 },
  { month: "February", amount: 312, resume_screenings: 178, assessments: 45 },
  { month: "March", amount: 198, resume_screenings: 112, assessments: 29 },
  { month: "April", amount: 425, resume_screenings: 234, assessments: 67 },
  { month: "May", amount: 389, resume_screenings: 201, assessments: 54 },
  { month: "June", amount: 467, resume_screenings: 267, assessments: 72 },
];

interface UserBillingProps {
  currentUser: Recruiter;
  walletBalance: {
    balance: number;
    currency: string;
    free_credits_remaining?: number;
    low_balance_threshold?: number | null;
    low_balance_alert_enabled?: boolean;
    pricing?: {
      resume_screening_price: number;
      assessment_price: number;
      minimum_topup: number;
      free_tier_limit: number;
    };
  } | null;
  walletTransactions: WalletTransaction[];
  walletUsage: WalletUsage | null;
}

const UserBilling = ({
  currentUser,
  walletBalance,
  walletTransactions,
  walletUsage,
}: UserBillingProps) => {
  const isNigerian = currentUser.country.toLowerCase() === "nigeria";
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
  // ─────────────────────────────────────────────────────────────────────
  // PAYSTACK/STRIPE-BY-COUNTRY SELECTION -- commented out, superseded.
  // Which gateway processes a top-up is now decided server-side by the
  // admin-editable active_payment_gateway setting (/admin/pricing), not by
  // this frontend's country guess. Bachs (the new default) handles both
  // NGN and USD, so this per-country branch is no longer needed to pick a
  // provider -- the backend's FundWalletView reads get_active_gateway()
  // itself. Left here, commented, as the reference for reactivating a
  // client-side provider indicator if that's ever wanted again.
  // const [selectedProvider] = useState<"paystack" | "stripe" | null>(
  //   isNigerian ? "paystack" : "stripe"
  // );
  // ─────────────────────────────────────────────────────────────────────
  const [fundCurrency, setFundCurrency] = useState<Currency>(currency);
  const [autoRecharge, setAutoRecharge] = useState<AutoRecharge | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditAutoRecharge, setShowEditAutoRecharge] = useState(false);
  const [editAmount, setEditAmount] = useState(50);
  const [editThreshold, setEditThreshold] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(5);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [newAutoRechargeAmount, setNewAutoRechargeAmount] = useState(50);
  const [newAutoRechargeThreshold, setNewAutoRechargeThreshold] = useState(10);
  const [showAutoRechargeSetup, setShowAutoRechargeSetup] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

  // Low-balance alert settings -- distinct from the (separate) auto-recharge
  // feature above: this just notifies, it never charges a card automatically.
  const [lowBalanceEnabled, setLowBalanceEnabled] = useState(
    walletBalance?.low_balance_alert_enabled ?? true
  );
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<string>(
    walletBalance?.low_balance_threshold != null ? String(walletBalance.low_balance_threshold) : ""
  );
  const [savingLowBalance, setSavingLowBalance] = useState(false);

  // Transaction history -- filter/pagination/export are client-side since
  // the server-rendered page only loads page 1 unfiltered on first paint.
  const [transactions, setTransactions] = useState<WalletTransaction[]>(walletTransactions);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<
    "" | "credit" | "debit" | "free_credit"
  >("");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsHasNext, setTransactionsHasNext] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const freeCreditsRemaining = walletBalance?.free_credits_remaining;
  const freeTierLimit = walletBalance?.pricing?.free_tier_limit ?? 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTransactionsLoading(true);
      const result = await getWalletTransactionsClient(
        transactionTypeFilter || undefined,
        transactionsPage
      );
      if (cancelled) return;
      setTransactions(result?.results ?? []);
      setTransactionsHasNext(!!result?.next);
      setTransactionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionTypeFilter, transactionsPage]);

  const handleSaveLowBalanceSettings = async () => {
    setSavingLowBalance(true);
    const result = await updateWalletSettings({
      low_balance_alert_enabled: lowBalanceEnabled,
      low_balance_threshold: lowBalanceThreshold === "" ? null : Number(lowBalanceThreshold),
    });
    setSavingLowBalance(false);
    if (result.success) {
      toast.success("Alert settings saved");
    } else {
      toast.error(result.error || "Failed to save alert settings");
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    const ok = await exportWalletTransactionsCsv();
    setExportingCsv(false);
    if (!ok) toast.error("Failed to export transactions");
  };

  const setAlert = useAlert(s => s.setAlert);

  const handleFundWallet = (amount: number) => {
    setSelectedAmount(amount);
  };

  const handleProceedToPayment = async () => {
    if (!selectedAmount) {
      toast.error("Please select an amount");
      return;
    }
    setIsFunding(true);
    const response = await fundWallet(selectedAmount);
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
    ai_interviews: walletUsage?.ai_interviews_used || 0,
    amount: walletUsage?.total_amount_spent || 0,
  };
  const totalUsage =
    currentMonthData.resume_screenings +
    currentMonthData.assessments +
    currentMonthData.ai_interviews;
  const screeningsPercentage =
    totalUsage > 0
      ? (currentMonthData.resume_screenings / totalUsage) * 100
      : 0;
  const assessmentsPercentage =
    totalUsage > 0 ? (currentMonthData.assessments / totalUsage) * 100 : 0;
  const aiInterviewsPercentage =
    totalUsage > 0 ? (currentMonthData.ai_interviews / totalUsage) * 100 : 0;

  const displayWalletData = {
    balance: walletUsage?.wallet_balance || 0,
    total_funded: 0,
    currency,
  };

  return (
    <div>
      {/* <button
        onClick={() => setShowEmptyState(prev => !prev)}
        className='mb-4 px-4 py-2 bg-gray-200 rounded-lg'
      >
        {showEmptyState ? "Load Data" : "Show Empty State"}
      </button> */}
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
                  className='px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  <option value='USD'>USD ($)</option>
                  <option value='EUR'>EUR (€)</option>
                  <option value='NGN'>NGN (₦)</option>
                </select>
              </div>
            </div> */}
          </div>
        </div>

          {typeof freeCreditsRemaining === "number" && freeCreditsRemaining > 0 && (
            <div className='mb-4 sm:mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 flex items-center gap-3'>
              <Gift size={20} className='text-emerald-600 flex-shrink-0' />
              <p className='text-xs sm:text-sm text-emerald-800'>
                <span className='font-semibold'>
                  {freeCreditsRemaining} of {freeTierLimit} free credits remaining.
                </span>{" "}
                Every candidate you screen, assess, or AI-interview uses one free credit until these run out. Once
                they do, we deduct from your wallet balance instead -- if that balance ever runs out, all of your
                active job listings are automatically paused until you top up.
              </p>
            </div>
          )}

          {freeCreditsRemaining === 0 && (
            <div className='mb-4 sm:mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-center gap-3'>
              <Info size={20} className='text-amber-600 flex-shrink-0' />
              <p className='text-xs sm:text-sm text-amber-800'>
                <span className='font-semibold'>Your free credits are used up.</span> We now deduct from your
                wallet balance for every candidate you screen, assess, or AI-interview. If your balance runs out,
                all of your active job listings are automatically paused -- and no longer accept applications --
                until you fund your wallet.
              </p>
            </div>
          )}

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6'>
            <div className='bg-gradient-to-br from-primary to-primary-dark rounded-xl p-4 sm:p-5 text-white'>
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
                className='w-full bg-white text-primary font-medium py-2 sm:py-2.5 text-sm sm:text-base rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2'
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
                  className='px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors'
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
                  <BarChart3 size={20} className='text-primary' />
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Monthly Usage Overview
                  </h2>
                </div>
                {/* <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className='px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                        <linearGradient
                          id='aiInterviewGrad'
                          x1='0%'
                          y1='0%'
                          x2='100%'
                          y2='100%'
                        >
                          <stop
                            offset='0%'
                            stopColor='#F59E0B'
                            stopOpacity='1'
                          />
                          <stop
                            offset='100%'
                            stopColor='#D97706'
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
                        <circle
                          cx='100'
                          cy='100'
                          r='75'
                          fill='none'
                          stroke='url(#aiInterviewGrad)'
                          strokeWidth='22'
                          strokeDasharray={`${
                            (aiInterviewsPercentage / 100) * 471.24
                          } 471.24`}
                          strokeDashoffset={`-${
                            ((screeningsPercentage + assessmentsPercentage) / 100) * 471.24
                          }`}
                          strokeLinecap='round'
                          className={cn(
                            "transition-all duration-1000 ease-in-out",
                            !aiInterviewsPercentage && "hidden"
                          )}
                          style={{
                            filter:
                              "drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))",
                          }}
                        />
                      </g>
                    </svg>
                    <div className='absolute inset-0 flex flex-col items-center justify-center'>
                      <div className='text-5xl font-bold bg-gradient-to-br from-primary via-primary to-primary-dark bg-clip-text text-transparent'>
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
                        <div className='w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-sm'></div>
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
                        className='bg-gradient-to-r from-primary to-primary-dark h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm'
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

                  <div>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm'></div>
                        <span className='text-sm font-medium text-gray-700'>
                          AI Interviews
                        </span>
                      </div>
                      <span className='text-lg font-bold text-gray-900'>
                        {currentMonthData.ai_interviews}
                      </span>
                    </div>
                    <div className='bg-gray-100 rounded-full h-2.5 overflow-hidden'>
                      <div
                        className='bg-gradient-to-r from-amber-500 to-amber-600 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm'
                        style={{ width: `${aiInterviewsPercentage}%` }}
                      ></div>
                    </div>
                    <div className='mt-2 text-xs font-medium text-gray-500'>
                      {aiInterviewsPercentage.toFixed(1)}% of total
                    </div>
                  </div>

                  <div className='pt-5 mt-2 border-t border-gray-200'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-semibold text-gray-600 uppercase tracking-wide'>
                        Amount Spent
                      </span>
                      <span className='text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent'>
                        {formatCurrency(currentMonthData.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200 p-5 mb-4 sm:mb-6'>
            <div className='flex items-center gap-2 mb-1'>
              <BellRing size={18} className='text-primary' />
              <h3 className='text-lg font-semibold text-gray-900'>Low Balance Alerts</h3>
            </div>
            <p className='text-sm text-gray-600 mb-4'>
              We will send you an email and in-app notification when your balance drops below this
              amount.
            </p>
            <div className='flex flex-col sm:flex-row sm:items-end gap-4'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={lowBalanceEnabled}
                  onChange={e => setLowBalanceEnabled(e.target.checked)}
                  className='w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary'
                />
                <span className='text-sm font-medium text-gray-700'>Enable low balance alerts</span>
              </label>
              <div className='flex-1 max-w-xs'>
                <label className='block text-xs font-medium text-gray-600 mb-1'>
                  Alert me when balance falls below
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm'>
                    {displayWalletData.currency === "NGN" ? "₦" : "$"}
                  </span>
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    value={lowBalanceThreshold}
                    onChange={e => setLowBalanceThreshold(e.target.value)}
                    placeholder='0.00'
                    className='w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                  />
                </div>
              </div>
              <button
                onClick={handleSaveLowBalanceSettings}
                disabled={savingLowBalance}
                className='px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 whitespace-nowrap'
              >
                {savingLowBalance ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-gray-200'>
            <div className='px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Transaction History
              </h2>
              <div className='flex items-center gap-2'>
                <select
                  value={transactionTypeFilter}
                  onChange={e => {
                    setTransactionsPage(1);
                    setTransactionTypeFilter(e.target.value as typeof transactionTypeFilter);
                  }}
                  className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  <option value=''>All</option>
                  <option value='credit'>Credits</option>
                  <option value='debit'>Debits</option>
                  <option value='free_credit'>Free credits</option>
                </select>
                <button
                  onClick={handleExportCsv}
                  disabled={exportingCsv}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Date
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Description
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Type
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Amount
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider max-sm:hidden'>
                      Balance After
                    </th>
                    <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider max-sm:hidden'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {transactionsLoading ? (
                    <tr>
                      <td colSpan={6} className='px-6 py-12 text-center text-sm text-gray-500'>
                        Loading...
                      </td>
                    </tr>
                  ) : showEmptyState || transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-6 py-12'>
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
                            className='px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors'
                          >
                            Fund Wallet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(transaction => {
                      const isFreeCredit = transaction.service_type === "free_credit";
                      const isCredit = transaction.transaction_type === "credit";
                      return (
                        <tr key={transaction.id} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {formatDate(transaction.created_at)}
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-900'>
                            {transaction.description || transaction.reference || "-"}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm'>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1",
                                isFreeCredit
                                  ? "text-primary"
                                  : isCredit
                                    ? "text-green-600"
                                    : "text-red-600"
                              )}
                            >
                              {isFreeCredit ? (
                                <Gift size={16} />
                              ) : (
                                <TrendingUp size={16} className={!isCredit ? "rotate-180" : ""} />
                              )}
                              {isFreeCredit ? "Free credit" : transaction.transaction_type}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-6 py-4 whitespace-nowrap text-sm text-right font-medium",
                              isCredit ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {isCredit ? "+" : "-"}
                            {formatPrice({
                              price: Math.abs(+transaction.amount),
                              currencyCode: transaction.currency,
                            })}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 max-sm:hidden'>
                            {transaction.balance_after != null
                              ? formatPrice({
                                  price: +transaction.balance_after,
                                  currencyCode: transaction.currency,
                                })
                              : "-"}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-center max-sm:hidden'>
                            <span
                              className={cn(
                                "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                                transaction.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : transaction.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                              )}
                            >
                              {transaction.status
                                ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)
                                : "Completed"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!showEmptyState && (transactionsPage > 1 || transactionsHasNext) && (
              <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
                <button
                  onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                  disabled={transactionsPage === 1 || transactionsLoading}
                  className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Previous
                </button>
                <span className='text-sm text-gray-600'>Page {transactionsPage}</span>
                <button
                  onClick={() => setTransactionsPage(p => p + 1)}
                  disabled={!transactionsHasNext || transactionsLoading}
                  className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Next
                </button>
              </div>
            )}
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
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
                            ? "border-primary bg-primary/5"
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
                          ? "border-primary bg-primary/5"
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
                          ? "border-primary bg-primary/5"
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
                  disabled={!selectedAmount || isFunding}
                  className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedAmount
                      ? "bg-primary text-white hover:bg-primary-dark"
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                    className='flex-1 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors'
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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
                  className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                  className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                    className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
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
                className='flex-1 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors'
              >
                Enable Auto-Recharge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserBilling;
