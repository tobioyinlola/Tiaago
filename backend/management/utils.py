from django.utils import timezone
from django.core.cache import cache
from django.db.models import Sum, Q
from contract.models import Contract
from create_user.models import CustomUser
from create_user.constants import UserTypes
from subscriptions.models import SubPlan


def get_previous_month_range(date:timezone.datetime):
    '''Function to get the range of the previous month e.g (1st - 31st)'''
    first_day_of_current_month = date.replace(day=1)
    last_day_of_last_month_date = first_day_of_current_month - timezone.timedelta(days=1)
    last_day_of_last_month = last_day_of_last_month_date.replace(hour=23, minute=59, second=59)
    first_day_of_last_month = last_day_of_last_month_date.replace(hour=0, minute=0, second=0, day=1)
    return first_day_of_last_month, last_day_of_last_month

def get_this_month_range():
    '''Function to get the range of the current month e.g (1st - 31st)'''
    now = timezone.now()
    next_month_num = now.date().month + 1
    if next_month_num > 12:
        next_month_num = 12
    next_month = now.replace(month=next_month_num)
    return get_previous_month_range(next_month)

def get_user_and_registration_metrics():
    user_metrics_cache_key = "get_user_metrics"
    cached_user_metrics = cache.get(user_metrics_cache_key)
    registration_metrics_cache_key = "get_registration_metrics"
    cached_registration_metrics = cache.get(registration_metrics_cache_key)
    if cached_user_metrics and cached_registration_metrics:
        return cached_user_metrics, cached_registration_metrics
    now = timezone.now()
    first_day_of_last_month, last_day_of_last_month = get_previous_month_range(now)
    first_day_of_this_month, last_day_of_this_month = get_this_month_range()
    last_month_filter_params = {"date_joined__range":[first_day_of_last_month, last_day_of_last_month]}
    this_month_filter_params = {"date_joined__range":[first_day_of_this_month, last_day_of_this_month]}
    # users
    total_users = CustomUser.objects.all()
    users_last_month = total_users.filter(**last_month_filter_params)
    users_this_month = total_users.filter(**this_month_filter_params)
    user_metrics = []
    registration_metrics = []
    registration_metrics.append({
        "title":"Total Registrations",
        "current_value":total_users.count(),
        "value_last_month":users_last_month.count(),
        "value_this_month":users_this_month.count()
    })
    user_metrics.append({
        "title":"Total Users",
        "current_value": total_users.filter(verified=True).count(),
        "value_last_month":users_last_month.filter(verified=True).count(),
        "value_this_month":users_this_month.filter(verified=True).count()
    })
    # talents
    total_talents = total_users.filter(user_type = UserTypes.talent)
    talents_last_month = total_talents.filter(**last_month_filter_params)
    talents_this_month = total_talents.filter(**this_month_filter_params)
    registration_metrics.append({
        "title":"Talent Registrations",
         "current_value":total_talents.count(),
        "value_last_month":talents_last_month.count(),
        "value_this_month":talents_this_month.count()
    })
    user_metrics.append({
        "title":"Talents",
        "current_value":total_talents.filter(verified=True).count(),
        "value_last_month":talents_last_month.filter(verified=True).count(),
        "value_this_month":talents_this_month.filter(verified=True).count()
    })
    # companies
    total_companies = total_users.filter(user_type = UserTypes.company)
    companies_last_month = total_companies.filter(**last_month_filter_params)
    companis_this_month = total_companies.filter(**this_month_filter_params)
    registration_metrics.append({
        "title":"Startup Registrations",
         "current_value":total_companies.count(),
        "value_last_month":companies_last_month.count(),
        "value_this_month":companis_this_month.count()
    })
    user_metrics.append({
        "title":"Startups",
        "current_value":total_companies.filter(verified=True).count(),
        "value_last_month":companies_last_month.filter(verified=True).count(),
        "value_this_month":companis_this_month.filter(verified=True).count()
    })
 
    cache.set(user_metrics_cache_key, user_metrics, timeout=300)
    cache.set(registration_metrics_cache_key, registration_metrics, timeout=300)
    return user_metrics, registration_metrics

def get_talent_metrics():
    cache_key = 'get_talent_metrics'
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    now = timezone.now()
    talent_metrics = []
    first_day_of_last_month, last_day_of_last_month = get_previous_month_range(now)
    first_day_of_this_month, last_day_of_this_month = get_this_month_range()
    # free talents
    free_talents_last_month = CustomUser.objects.filter(subscription=None,date_joined__range=[first_day_of_last_month, last_day_of_last_month], user_type=UserTypes.talent).count()
    free_talents_this_month = CustomUser.objects.filter(subscription=None,date_joined__range=[first_day_of_this_month, last_day_of_this_month], user_type=UserTypes.talent).count()
    all_free_talents = CustomUser.objects.filter(subscription=None, user_type=UserTypes.talent).count()
    talent_metrics.append({
        "title":"Free Talents",
        "value_last_month":free_talents_last_month,
        "value_this_month":free_talents_this_month,
        "current_value": all_free_talents
    })
    # basic talents
    basic_talents_last_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.BASIC,date_joined__range=[first_day_of_last_month, last_day_of_last_month], user_type=UserTypes.talent).count()
    basic_talents_this_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.BASIC,date_joined__range=[first_day_of_this_month, last_day_of_this_month], user_type=UserTypes.talent).count()
    all_basic_talents = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.BASIC, user_type=UserTypes.talent).count()
    talent_metrics.append({
        "title":"Basic Talents",
        "value_last_month":basic_talents_last_month,
        "value_this_month":basic_talents_this_month,
        "current_value": all_basic_talents
    })
    # pro talents
    pro_talents_last_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.PREMIUM,date_joined__range=[first_day_of_last_month, last_day_of_last_month], user_type=UserTypes.talent).count()
    pro_talents_this_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.PREMIUM,date_joined__range=[first_day_of_this_month, last_day_of_this_month], user_type=UserTypes.talent).count()
    all_pro_talents = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.PREMIUM, user_type=UserTypes.talent).count()
    talent_metrics.append({
        "title":"Pro Talents",
        "value_last_month":pro_talents_last_month,
        "value_this_month":pro_talents_this_month,
        "current_value": all_pro_talents
    })
    cache.set(cache_key, talent_metrics, timeout=300)
    return talent_metrics


def get_startup_metrics():
    cache_key = "get_startup_metrics"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    now = timezone.now()
    startup_metrics = []
    first_day_of_last_month, last_day_of_last_month = get_previous_month_range(now)
    first_day_of_this_month, last_day_of_this_month = get_this_month_range()
    # free talents
    free_startups_last_month = CustomUser.objects.filter(subscription=None,date_joined__range=[first_day_of_last_month, last_day_of_last_month], user_type=UserTypes.company).count()
    free_startups_this_month = CustomUser.objects.filter(subscription=None,date_joined__range=[first_day_of_this_month, last_day_of_this_month], user_type=UserTypes.company).count()
    all_free_startups = CustomUser.objects.filter(subscription=None, user_type=UserTypes.company).count()
    startup_metrics.append({
        "title":"Free Startups",
        "value_last_month":free_startups_last_month,
        "value_this_month":free_startups_this_month,
        "current_value": all_free_startups
    })
    # basic talents
    basic_startups_last_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.BASIC,date_joined__range=[first_day_of_last_month, last_day_of_last_month], user_type=UserTypes.company).count()
    basic_startups_this_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.BASIC,date_joined__range=[first_day_of_this_month, last_day_of_this_month], user_type=UserTypes.company).count()
    all_basic_startups = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.BASIC, user_type=UserTypes.company).count()
    startup_metrics.append({
        "title":"Basic Startups",
        "value_last_month":basic_startups_last_month,
        "value_this_month":basic_startups_this_month,
        "current_value": all_basic_startups
    })
    # pro talents
    pro_talents_last_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.PREMIUM,date_joined__range=[first_day_of_last_month, last_day_of_last_month], user_type=UserTypes.company).count()
    pro_talents_this_month = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.PREMIUM,date_joined__range=[first_day_of_this_month, last_day_of_this_month], user_type=UserTypes.company).count()
    all_pro_talents = CustomUser.objects.filter(subscription__sub_plan__sub_type=SubPlan.SUB_TYPE.PREMIUM, user_type=UserTypes.company).count()
    startup_metrics.append({
        "title":"Pro Startups",
        "value_last_month":pro_talents_last_month,
        "value_this_month":pro_talents_this_month,
        "current_value": all_pro_talents
    })
    cache.set(cache_key, startup_metrics, timeout=300)
    return startup_metrics


def get_contract_metrics():
    cache_key = "get_contract_metrics"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    now = timezone.now()
    contract_metrics = []
    first_day_of_last_month, last_day_of_last_month = get_previous_month_range(now)
    first_day_of_this_month, _ = get_this_month_range()
    active_contracts = Contract.objects.filter(expires__gt=now)
    active_contracts_current_value = active_contracts.aggregate(total=Sum("value")).get("total") or 0
    contract_metrics.append({
        "title":"Active Contracts",
        # contracts that were created before 
        "value_last_month": Contract.objects.filter(
            expires__gt=first_day_of_last_month,
            created__lt=last_day_of_last_month
        ).count(),
        "value_this_month":active_contracts.count(),
        "current_value":active_contracts_current_value
    })

    completed_contracts_current_value = Contract.objects.filter(expires__lte=now).aggregate(total=Sum("value")).get("total") or 0
    completed_contracts_this_month = Contract.objects.filter(expires__range=[first_day_of_this_month, now]).count()
    completed_contracts_last_month = Contract.objects.filter(expires__range=[first_day_of_last_month, last_day_of_last_month]).count()
    contract_metrics.append({
        "title":"Completed Contracts",
        "value_last_month":completed_contracts_last_month,
        "value_this_month":completed_contracts_this_month,
        "current_value":completed_contracts_current_value
    })
    cache.set(cache_key, contract_metrics, timeout=300)
    return contract_metrics
