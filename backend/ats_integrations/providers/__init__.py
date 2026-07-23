from . import ashby, breezyhr, gem, greenhouse, jazzhr, jobvite, lever, recruiterflow, recruitee, smartrecruiters, teamtailor, workable, zohorecruit

PROVIDER_REGISTRY = {
    greenhouse.PROVIDER_CONFIG_KEY: greenhouse,
    lever.PROVIDER_CONFIG_KEY: lever,
    workable.PROVIDER_CONFIG_KEY: workable,
    smartrecruiters.PROVIDER_CONFIG_KEY: smartrecruiters,
    zohorecruit.PROVIDER_CONFIG_KEY: zohorecruit,
    ashby.PROVIDER_CONFIG_KEY: ashby,
    gem.PROVIDER_CONFIG_KEY: gem,
    breezyhr.PROVIDER_CONFIG_KEY: breezyhr,
    jazzhr.PROVIDER_CONFIG_KEY: jazzhr,
    jobvite.PROVIDER_CONFIG_KEY: jobvite,
    recruiterflow.PROVIDER_CONFIG_KEY: recruiterflow,
    recruitee.PROVIDER_CONFIG_KEY: recruitee,
    teamtailor.PROVIDER_CONFIG_KEY: teamtailor,
}
