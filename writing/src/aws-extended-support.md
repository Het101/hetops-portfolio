---
title: "Your old AWS versions are now a line on your bill: find them before they cost you"
published: false
description: "EKS, RDS, ElastiCache and OpenSearch now charge automatically for running old versions. Here's how to find every affected resource across regions, by hand or with one command."
tags: aws, devops, kubernetes, finops
cover_image: https://raw.githubusercontent.com/Het101/retirement-radar/main/docs/banner.png
---

<!--
How to post on dev.to:
1. dev.to → Create Post → switch to the Markdown editor (or paste this whole file, front matter included).
2. Check the preview, then set published: true (or click Publish).
3. Post Tuesday–Thursday. Reply to every comment in the first day.
Facts re-checked against the AWS pages on 2026-10-05; links are inline.
-->

For years, running an old database or Kubernetes version on AWS was a security problem you could put off. It isn't any more. It's a billing problem, and it starts automatically.

- **EKS:** when a Kubernetes version leaves standard support, the cluster moves to [extended support](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) on its own. The control plane goes from **$0.10 to $0.60 per hour**: about **$365 a month extra, per cluster**. After 12 more months, AWS upgrades the control plane for you, whether your workloads are ready or not.
- **RDS and Aurora:** past the end of standard support, databases are [enrolled in RDS Extended Support](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html) and billed **per vCPU-hour** on top of the instance price, with a higher rate from year three. PostgreSQL 13 crossed that line on 28 February 2026 and RDS for MySQL 8.0 on 31 July 2026.
- **ElastiCache:** Redis OSS 4 and 5 have been on paid [Extended Support](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/extended-support-versions.html) since 1 February 2026. Redis OSS 6 follows on 31 January 2027.
- **OpenSearch:** from **7 November 2026**, Extended Support for older Elasticsearch and OpenSearch versions [costs as much as the instances themselves](https://aws.amazon.com/blogs/big-data/amazon-opensearch-service-extends-version-lifecycle-support-timelines/). For those domains, the bill roughly doubles next month.
- **Lambda:** no charge, but deprecated runtimes stop getting security patches. `python3.10` is [deprecated on 31 October 2026](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) and `dotnet8` on 10 November 2026.

None of this arrives as an alert. It shows up in Cost Explorer, weeks later, as a line most people don't recognise.

## Finding it by hand

Old versions hide in regions nobody looks at, so loop over all of them. These are read-only calls.

```bash
for r in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
  echo "== $r"
  # EKS: cluster versions
  for c in $(aws eks list-clusters --region "$r" --query 'clusters' --output text); do
    aws eks describe-cluster --region "$r" --name "$c" --query 'cluster.[name,version]' --output text
  done
  # RDS and Aurora: engine versions
  aws rds describe-db-instances --region "$r" \
    --query 'DBInstances[].[DBInstanceIdentifier,Engine,EngineVersion]' --output text
  aws rds describe-db-clusters --region "$r" \
    --query 'DBClusters[].[DBClusterIdentifier,Engine,EngineVersion]' --output text
  # ElastiCache: engine versions
  aws elasticache describe-cache-clusters --region "$r" \
    --query 'CacheClusters[].[CacheClusterId,Engine,EngineVersion]' --output text
  # Lambda: runtimes
  aws lambda list-functions --region "$r" \
    --query 'Functions[].[FunctionName,Runtime]' --output text
done
```

Then compare what you find with each service's calendar. For EKS there's a shortcut: `aws eks describe-cluster-versions` returns every version with its end of standard and extended support dates.

A few things that trip people up:

- **Aurora and RDS have different calendars.** Aurora MySQL version 3 (MySQL 8.0 compatible) stays on standard support until [30 April 2028](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.release-calendars.html), while RDS for MySQL 8.0 left it in July 2026. Same "8.0", very different bill.
- **Minor versions retire before majors.** A PostgreSQL 14 database is fine until February 2027 as a major version, but some 14.x minors leave support earlier.
- **Replication groups and read replicas** share the primary's version, so count them once, not per node.

## Or with one command

I got tired of running that loop and squinting at calendars, so I wrote **Retirement Radar**, a small open-source CLI that does it for EKS, RDS/Aurora, ElastiCache, OpenSearch, MSK and Lambda, across every enabled region:

```bash
npx retirement-radar scan
```

![Example output: resources marked RETIRED, EXTENDED, SOON or UPCOMING, with the end-of-support date and what it means](https://raw.githubusercontent.com/Het101/retirement-radar/main/docs/scan-output.png)

Each row says what's happening and when: **RETIRED** (past the end), **EXTENDED** (you're paying extended support right now), **SOON** (within 90 days) or **UPCOMING** (within a year), plus an estimate of what EKS extended support is costing you per month.

A few design choices, because this tool runs with your AWS credentials:

- **Read-only.** It only calls `list-*`, `describe-*` and `get-*` APIs, and a test fails the build if that ever changes. The README has a minimal IAM policy.
- **Local.** It uses the AWS CLI you already have (profiles, SSO and assumed roles just work) and sends nothing anywhere.
- **Dates with sources.** Every date lives in a [`retirements.yaml`](https://github.com/Het101/retirement-radar/blob/main/retirements.yaml) with the AWS page it came from. A version it doesn't know is reported as `unknown`, never as fine.
- **CI-friendly.** `--fail-on soon` exits 1 when something needs action within 90 days, so a weekly GitHub Actions job can open the conversation before the bill does.

```yaml
# .github/workflows/retirement-radar.yml
on: { schedule: [{ cron: "0 8 * * 1" }], workflow_dispatch: {} }
permissions: { id-token: write, contents: read }
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: arn:aws:iam::123456789012:role/retirement-radar, aws-region: us-east-1 }
      - run: npx retirement-radar scan --fail-on soon
```

## What to do with the results

- **EXTENDED on EKS:** every month you wait is roughly $365 per cluster. Upgrade one minor version at a time; check deprecated APIs first.
- **EXTENDED on RDS:** a blue/green deployment makes major upgrades far less scary than they used to be. Test the application against the new version on a snapshot restore first.
- **OpenSearch on an early version:** this is the urgent one. After 7 November the extension costs as much as the domain.
- **SOON on Lambda:** usually the cheapest fix of all: change the runtime, run your tests, deploy.

The code and the dates file are on GitHub: [Het101/retirement-radar](https://github.com/Het101/retirement-radar). If you spot a wrong or missing date, there's an issue form for exactly that, and it's the most useful contribution the project gets.
