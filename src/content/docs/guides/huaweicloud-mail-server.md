---
title: 华为云邮件服务器搭建
description: 本文讲述了如何在华为云服务器上搭建双向邮件服务器
---

## 安装 Docker

以 Debian 系统为例

```shell
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## He.net 获取 ipv6

访问[HURRICANE ELECTRIC](https://tunnelbroker.net/), 创建一个号，点击 `Create Regular Tunnel`, `EndPoint` 是你的公网IP， 地域建议选择比较近的，这里以新加坡为例子，然后点击创建就行，点击`Main Page`，可以看到已经创建了一个 tunnel，点击那个`Name`以下的链接。

这里能看到 `Routed /64` 和 `Routed /48`, 等下要用到记住它们，就以`2001:470:1111::/64`为例吧，此外记住`Server IPv4 Address`。

然后连接到你的服务器，输入`ip a`,找到`ens3`,会有一行:

```shell
inet 172.41.8.0/20 brd 172.41.8.255 scope global dynamic ens3
```

记住 `172.41.8.0`

打开`/etc/network/interface`,添加:

```shell
auto he-ipv6
iface he-ipv6 inet6 v4tunnel
        address 2001:470:1111::
        netmask 64
        endpoint 216.218.221.42
        local 172.41.8.0
        ttl 255
        gateway 2001:470:1111::1
```

此处，`address`为`Routed`,`netmask`为后面跟着的数字，`Server IPv4 Address`,其他的也需要替换。

保存之后，输入`systemctl restart networking`，再输入`ping6 www.google.com`，如果有:

```shell
PING www.google.com (2404:6800:4003:c06::69) 56 data bytes
64 bytes from sm-in-f105.1e100.net (2404:6800:4003:c06::69): icmp_seq=1 ttl=108 time=32.8 ms
64 bytes from sm-in-f105.1e100.net (2404:6800:4003:c06::69): icmp_seq=2 ttl=108 time=33.8 ms
64 bytes from sm-in-f105.1e100.net (2404:6800:4003:c06::69): icmp_seq=3 ttl=108 time=32.9 ms
```

说明 v6 网络已经配置完了。

## He.net 考试获取 25 解锁权限

点击右侧的[Certification](https://ipv6.he.net/certification/),输入你之前注册的账号密码，不停的考试到`Sage`级别，现在有AI了，全问AI吧。

到了Sage级别之后，可以发邮件给`ipv6@he.net`请求打开25端口访问权限了，等两天会有一封邮件回复，在`tunnel`界面会有`IRC`和`SMTP`的`UNLOCK`被打开，点击就行。

## 安装 docker-mailserver

这里是对于[官方教程](https://docker-mailserver.github.io/docker-mailserver/edge/config/security/ssl/#example-using-certbot-dns-cloudflare-with-docker)的一个总结，想了解更多的可以自己去看。

### 创建 SWAP 分区

邮件服务器一般需要的内存比较多，小鸡内存一般不够，需要设置SWAP：

```shell
# 1. 创建 4GB 的 swap 文件
sudo fallocate -l 4G /swapfile

# 2. 设置文件权限 (只有root可读写)
sudo chmod 600 /swapfile

# 3. 格式化为 swap 空间
sudo mkswap /swapfile

# 4. 激活 swap 空间
sudo swapon /swapfile

# 5. 验证 swap 空间是否已激活
free -h
sudo swapon --show
# 备份 /etc/fstab 文件 (重要步骤！)
sudo cp /etc/fstab /etc/fstab.bak

# 将 swap 文件条目添加到 /etc/fstab 文件末尾
# 使用 tee -a 避免直接编辑文件，并安全地追加内容
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 验证 /etc/fstab 内容是否已添加 (可选)
tail /etc/fstab

# 测试 /etc/fstab 配置 (推荐，无输出即为成功)
sudo mount -a
```

### 创建文件夹

```shell
mkdir mailserver && cd mailserver
```
### 获取 Cloudflare API

不赘述，只要注意只需要MX指向域名的编辑区域DNS权限就可以了，放到`mailserver`文件夹下的`docker-data/certbot/secrets`:

```ini
dns_cloudflare_api_token = xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 修改 Docker 设置以启用 Ipv6

主要是修改`/etc/docker/daemon.json`:

```json
{
  "ip6tables": true,
  "experimental" : true,
  "userland-proxy": true
}
```

记得重启 Docker: `systemctl restart docker`。

### 创建 `compose.yaml`

```yaml
services:
  mailserver:
    image: ghcr.io/docker-mailserver/docker-mailserver:latest
    container_name: mailserver
    # Provide the FQDN of your mail server here (Your DNS MX record should point to this value)
    hostname: mail.xxxxx
    env_file: mailserver.env
    # More information about the mail-server ports:
    # https://docker-mailserver.github.io/docker-mailserver/latest/config/security/understanding-the-ports/
    ports:
      - "25:25"    # SMTP  (explicit TLS => STARTTLS, Authentication is DISABLED => use port 465/587 instead)
      - "143:143"  # IMAP4 (explicit TLS => STARTTLS)
      - "465:465"  # ESMTP (implicit TLS)
      - "587:587"  # ESMTP (explicit TLS => STARTTLS)
      - "993:993"  # IMAP4 (implicit TLS)
      - "110:110"  # POP3
      - "995:995"  # POP3 (with TLS)
    volumes:
      - ./docker-data/dms/mail-data/:/var/mail/
      - ./docker-data/dms/mail-state/:/var/mail-state/
      - ./docker-data/dms/mail-logs/:/var/log/mail/
      - ./docker-data/dms/config/:/tmp/docker-mailserver/
      - /etc/localtime:/etc/localtime:ro
      - ./docker-data/certbot/certs/:/etc/letsencrypt/:ro
    restart: always
    stop_grace_period: 1m
    healthcheck:
      test: "ss --listening --tcp | grep -P 'LISTEN.+:smtp' || exit 1"
      timeout: 3s
      retries: 0
    cap_add:
      - NET_ADMIN # For Fail2Ban to work
    networks:
      - dms-ipv6
  certbot-cloudflare:
    image: certbot/dns-cloudflare:latest
    command: certonly --dns-cloudflare --dns-cloudflare-credentials /run/secrets/cloudflare-api-token -d mail.xxxx --agree-tos --non-interactive --email xxx@xxxx
    volumes:
      - ./docker-data/certbot/certs/:/etc/letsencrypt/
      - ./docker-data/certbot/logs/:/var/log/letsencrypt/
    secrets:
      - cloudflare-api-token
  certbot-cloudflare-renew:
    image: certbot/dns-cloudflare:latest
    command: renew --dns-cloudflare --dns-cloudflare-credentials /run/secrets/cloudflare-api-token --agree-tos --non-interactive --email xxx@xxxx --reuse-key
    volumes:
      - ./docker-data/certbot/certs/:/etc/letsencrypt/
      - ./docker-data/certbot/logs/:/var/log/letsencrypt/
    secrets:
      - cloudflare-api-token
secrets:
  cloudflare-api-token:
    file: ./docker-data/certbot/secrets/cloudflare.ini
networks:
  dms-ipv6:
    enable_ipv6: true
    ipam:
      config:
        - subnet: fd00:cafe:face:feed::/64
```

### 创建`mailserver.env`

```toml
# -----------------------------------------------
# --- Mailserver Environment Variables ----------
# -----------------------------------------------

# DOCUMENTATION FOR THESE VARIABLES IS FOUND UNDER
# https://docker-mailserver.github.io/docker-mailserver/latest/config/environment/

# -----------------------------------------------
# --- General Section ---------------------------
# -----------------------------------------------

# empty => uses the `hostname` command to get the mail server's canonical hostname
# => Specify a fully-qualified domainname to serve mail for.  This is used for many of the config features so if you can't set your hostname (e.g. you're in a container platform that doesn't let you) specify it in this environment variable.
OVERRIDE_HOSTNAME=

# REMOVED in version v11.0.0! Use LOG_LEVEL instead.
DMS_DEBUG=0

# Set the log level for DMS.
# This is mostly relevant for container startup scripts and change detection event feedback.
#
# Valid values (in order of increasing verbosity) are: `error`, `warn`, `info`, `debug` and `trace`.
# The default log level is `info`.
LOG_LEVEL=info

# critical => Only show critical messages
# error => Only show erroneous output
# **warn** => Show warnings
# info => Normal informational output
# debug => Also show debug messages
SUPERVISOR_LOGLEVEL=

# Support for deployment where these defaults are not compatible (eg: some NAS appliances):
# /var/mail vmail User ID (default: 5000)
DMS_VMAIL_UID=
# /var/mail vmail Group ID (default: 5000)
DMS_VMAIL_GID=

# **empty** => use FILE
# LDAP => use LDAP authentication
# OIDC => use OIDC authentication (not yet implemented)
# FILE => use local files (this is used as the default)
ACCOUNT_PROVISIONER=

# empty => postmaster@domain.com
# => Specify the postmaster address
POSTMASTER_ADDRESS=

# Check for updates on container start and then once a day
# If an update is available, a mail is sent to POSTMASTER_ADDRESS
# 0 => Update check disabled
# 1 => Update check enabled
ENABLE_UPDATE_CHECK=1

# Customize the update check interval.
# Number + Suffix. Suffix must be 's' for seconds, 'm' for minutes, 'h' for hours or 'd' for days.
UPDATE_CHECK_INTERVAL=1d

# Set different options for mynetworks option (can be overwrite in postfix-main.cf)
# **WARNING**: Adding the docker network's gateway to the list of trusted hosts, e.g. using the `network` or
# `connected-networks` option, can create an open relay
# https://github.com/docker-mailserver/docker-mailserver/issues/1405#issuecomment-590106498
# The same can happen for rootless podman. To prevent this, set the value to "none" or configure slirp4netns
# https://github.com/docker-mailserver/docker-mailserver/issues/2377
#
# none => Explicitly force authentication
# container => Container IP address only
# host => Add docker container network (ipv4 only)
# network => Add all docker container networks (ipv4 only)
# connected-networks => Add all connected docker networks (ipv4 only)
PERMIT_DOCKER=none

# Set the timezone. If this variable is unset, the container runtime will try to detect the time using
# `/etc/localtime`, which you can alternatively mount into the container. The value of this variable
# must follow the pattern `AREA/ZONE`, i.e. of you want to use Germany's time zone, use `Europe/Berlin`.
# You can lookup all available timezones here: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
TZ=

# In case you network interface differs from 'eth0', e.g. when you are using HostNetworking in Kubernetes,
# you can set NETWORK_INTERFACE to whatever interface you want. This interface will then be used.
#  - **empty** => eth0
NETWORK_INTERFACE=

# empty => modern
# modern => Limits the cipher suite to secure ciphers only.
# intermediate => Relaxes security by adding additional ciphers for broader compatibility.
# NOTE: The minimum TLS version supported is 1.2, if you need to lower that follow this workaround advice:
# https://github.com/docker-mailserver/docker-mailserver/pull/2945#issuecomment-1949907964
TLS_LEVEL=

# Configures the handling of creating mails with forged sender addresses.
#
# **0** => (not recommended) Mail address spoofing allowed. Any logged in user may create email messages with a forged sender address (see also https://en.wikipedia.org/wiki/Email_spoofing).
# 1 => Mail spoofing denied. Each user may only send with their own or their alias addresses. Addresses with extension delimiters(http://www.postfix.org/postconf.5.html#recipient_delimiter) are not able to send messages.
SPOOF_PROTECTION=

# Enables the Sender Rewriting Scheme. SRS is needed if your mail server acts as forwarder. See [postsrsd](https://github.com/roehling/postsrsd/blob/main/README.rst) for further explanation.
#  - **0** => Disabled
#  - 1 => Enabled
ENABLE_SRS=0

# Enables the OpenDKIM service.
# **1** => Enabled
#   0   => Disabled
ENABLE_OPENDKIM=0

# Enables the OpenDMARC service.
# **1** => Enabled
#   0   => Disabled
ENABLE_OPENDMARC=0


# Enabled `policyd-spf` in Postfix's configuration. You will likely want to set this
# to `0` in case you're using Rspamd (`ENABLE_RSPAMD=1`).
#
# - 0     => Disabled
# - **1** => Enabled
ENABLE_POLICYD_SPF=0

# Enables POP3 service
# - **0** => Disabled
# - 1     => Enabled
ENABLE_POP3=1

# Enables IMAP service
# - 0     => Disabled
# - **1** => Enabled
ENABLE_IMAP=1

# Enables ClamAV, and anti-virus scanner.
#   1   => Enabled
# **0** => Disabled
ENABLE_CLAMAV=1

# Add the value of this ENV as a prefix to the mail subject when spam is detected.
# NOTE: This subject prefix may be redundant (by default spam is delivered to a junk folder).
#       It provides value when your junk mail is stored alongside legitimate mail instead of a separate location (like with `SPAMASSASSIN_SPAM_TO_INBOX=1` or `MOVE_SPAM_TO_JUNK=0` or a POP3 only setup, without IMAP).
# NOTE: When not using Docker Compose, other CRI may not support quote-wrapping the value here to preserve any trailing white-space.
SPAM_SUBJECT=

# Enables Rspamd
# **0** => Disabled
#   1   => Enabled
ENABLE_RSPAMD=1

# When `ENABLE_RSPAMD=1`, an internal Redis instance is enabled implicitly.
# This setting provides an opt-out to allow using an external instance instead.
# 0 => Disabled
# 1 => Enabled
ENABLE_RSPAMD_REDIS=

# When enabled,
#
# 1. the "[autolearning][rspamd-autolearn]" feature is turned on;
# 2. the Bayes classifier will be trained when moving mails from or to the Junk folder (with the help of Sieve scripts).
#
# **0** => disabled
# 1     => enabled
RSPAMD_LEARN=0

# This settings controls whether checks should be performed on emails coming
# from authenticated users (i.e. most likely outgoing emails). The default value
# is `0` in order to align better with SpamAssassin. We recommend reading
# through https://rspamd.com/doc/tutorials/scanning_outbound.html though to
# decide for yourself whether you need and want this feature.
#
# Note that DKIM signing of e-mails will still happen.
RSPAMD_CHECK_AUTHENTICATED=0

# Controls whether the Rspamd Greylisting module is enabled.
# This module can further assist in avoiding spam emails by greylisting
# e-mails with a certain spam score.
#
# **0** => disabled
# 1     => enabled
RSPAMD_GREYLISTING=1

# Can be used to enable or disable the Hfilter group module.
#
# - 0     => Disabled
# - **1** => Enabled
RSPAMD_HFILTER=1

# Can be used to control the score when the HFILTER_HOSTNAME_UNKNOWN symbol applies. A higher score is more punishing. Setting it to 15 is equivalent to rejecting the email when the check fails.
#
# Default: 6
RSPAMD_HFILTER_HOSTNAME_UNKNOWN_SCORE=6

# Can be used to enable or disable the (still experimental) neural module.
#
# - **0** => Disabled
# - 1     => Enabled
RSPAMD_NEURAL=0

# Amavis content filter (used for ClamAV & SpamAssassin)
# 0 => Disabled
# 1 => Enabled
ENABLE_AMAVIS=0

# -1/-2/-3 => Only show errors
# **0**    => Show warnings
# 1/2      => Show default informational output
# 3/4/5    => log debug information (very verbose)
AMAVIS_LOGLEVEL=0

# This enables DNS block lists in Postscreen.
# Note: Emails will be rejected, if they don't pass the block list checks!
# **0** => DNS block lists are disabled
# 1     => DNS block lists are enabled
ENABLE_DNSBL=0

# If you enable Fail2Ban, don't forget to add the following lines to your `compose.yaml`:
#    cap_add:
#      - NET_ADMIN
# Otherwise, `nftables` won't be able to ban IPs.
ENABLE_FAIL2BAN=1

# Fail2Ban blocktype
# drop   => drop packet (send NO reply)
# reject => reject packet (send ICMP unreachable)
FAIL2BAN_BLOCKTYPE=drop

# 1 => Enables Managesieve on port 4190
# empty => disables Managesieve
ENABLE_MANAGESIEVE=

# **enforce** => Allow other tests to complete. Reject attempts to deliver mail with a 550 SMTP reply, and log the helo/sender/recipient information. Repeat this test the next time the client connects.
# drop => Drop the connection immediately with a 521 SMTP reply. Repeat this test the next time the client connects.
# ignore => Ignore the failure of this test. Allow other tests to complete. Repeat this test the next time the client connects. This option is useful for testing and collecting statistics without blocking mail.
POSTSCREEN_ACTION=enforce

# empty => all daemons start
# 1 => only launch postfix smtp
SMTP_ONLY=

# Please read [the SSL page in the documentation](https://docker-mailserver.github.io/docker-mailserver/latest/config/security/ssl) for more information.
#
# empty => SSL disabled
# letsencrypt => Enables Let's Encrypt certificates
# custom => Enables custom certificates
# manual => Let's you manually specify locations of your SSL certificates for non-standard cases
# self-signed => Enables self-signed certificates
SSL_TYPE=letsencrypt

# These are only supported with `SSL_TYPE=manual`.
# Provide the path to your cert and key files that you've mounted access to within the container.
SSL_CERT_PATH=
SSL_KEY_PATH=
# Optional: A 2nd certificate can be supported as fallback (dual cert support), eg ECDSA with an RSA fallback.
# Useful for additional compatibility with older MTA and MUA (eg pre-2015).
SSL_ALT_CERT_PATH=
SSL_ALT_KEY_PATH=

# Set how many days a virusmail will stay on the server before being deleted
# empty => 7 days
VIRUSMAILS_DELETE_DELAY=

# Configure Postfix `virtual_transport` to deliver mail to a different LMTP client (default is a dovecot socket).
# Provide any valid URI. Examples:
#
# empty => `lmtp:unix:/var/run/dovecot/lmtp` (default, configured in Postfix main.cf)
# `lmtp:unix:private/dovecot-lmtp` (use socket)
# `lmtps:inet:<host>:<port>` (secure lmtp with starttls)
# `lmtp:<kopano-host>:2003` (use kopano as mailstore)
POSTFIX_DAGENT=

# Set the mailbox size limit for all users. If set to zero, the size will be unlimited (default). Size is in bytes.
#
# empty => 0
POSTFIX_MAILBOX_SIZE_LIMIT=

# See https://docker-mailserver.github.io/docker-mailserver/latest/config/account-management/overview/#quotas
# 0 => Dovecot quota is disabled
# 1 => Dovecot quota is enabled
ENABLE_QUOTAS=1

# Set the message size limit for all users. If set to zero, the size will be unlimited (not recommended!). Size is in bytes.
#
# empty => 10240000 (~10 MB)
POSTFIX_MESSAGE_SIZE_LIMIT=

# Mails larger than this limit won't be scanned.
# ClamAV must be enabled (ENABLE_CLAMAV=1) for this.
#
# empty => 25M (25 MB)
CLAMAV_MESSAGE_SIZE_LIMIT=

# Enables regular pflogsumm mail reports.
# This is a new option. The old REPORT options are still supported for backwards compatibility. If this is not set and reports are enabled with the old options, logrotate will be used.
#
# not set => No report
# daily_cron => Daily report for the previous day
# logrotate => Full report based on the mail log when it is rotated
PFLOGSUMM_TRIGGER=

# Recipient address for pflogsumm reports.
#
# not set => Use REPORT_RECIPIENT or POSTMASTER_ADDRESS
# => Specify the recipient address(es)
PFLOGSUMM_RECIPIENT=

# Sender address (`FROM`) for pflogsumm reports if pflogsumm reports are enabled.
#
# not set => Use REPORT_SENDER
# => Specify the sender address
PFLOGSUMM_SENDER=

# Interval for logwatch report.
#
# none => No report is generated
# daily => Send a daily report
# weekly => Send a report every week
LOGWATCH_INTERVAL=

# Recipient address for logwatch reports if they are enabled.
#
# not set => Use REPORT_RECIPIENT or POSTMASTER_ADDRESS
# => Specify the recipient address(es)
LOGWATCH_RECIPIENT=

# Sender address (`FROM`) for logwatch reports if logwatch reports are enabled.
#
# not set => Use REPORT_SENDER
# => Specify the sender address
LOGWATCH_SENDER=

# Defines who receives reports if they are enabled.
# **empty** => ${POSTMASTER_ADDRESS}
# => Specify the recipient address
REPORT_RECIPIENT=

# Defines who sends reports if they are enabled.
# **empty** => mailserver-report@${DOMAINNAME}
# => Specify the sender address
REPORT_SENDER=

# Changes the interval in which log files are rotated
# **weekly** => Rotate log files weekly
# daily => Rotate log files daily
# monthly => Rotate log files monthly
#
# Note: This Variable actually controls logrotate inside the container
# and rotates the log files depending on this setting. The main log output is
# still available in its entirety via `docker logs mail` (Or your
# respective container name). If you want to control logrotation for
# the Docker-generated logfile see:
# https://docs.docker.com/config/containers/logging/configure/
#
# Note: This variable can also determine the interval for Postfix's log summary reports, see [`PFLOGSUMM_TRIGGER`](#pflogsumm_trigger).
LOGROTATE_INTERVAL=weekly

# Defines how many log files are kept by logrorate
LOGROTATE_COUNT=4


# If enabled, employs `reject_unknown_client_hostname` to sender restrictions in Postfix's configuration.
#
# - **0** => Disabled
# - 1 => Enabled
POSTFIX_REJECT_UNKNOWN_CLIENT_HOSTNAME=0

# Choose TCP/IP protocols for postfix to use
# **all** => All possible protocols.
# ipv4 => Use only IPv4 traffic. Most likely you want this behind Docker.
# ipv6 => Use only IPv6 traffic.
#
# Note: More details at http://www.postfix.org/postconf.5.html#inet_protocols
POSTFIX_INET_PROTOCOLS=all

# Enables MTA-STS support for outbound mail.
# More details: https://docker-mailserver.github.io/docker-mailserver/v13.3/config/best-practices/mta-sts/
# - **0** ==> MTA-STS disabled
# - 1 => MTA-STS enabled
ENABLE_MTA_STS=0

# Choose TCP/IP protocols for dovecot to use
# **all** => Listen on all interfaces
# ipv4 => Listen only on IPv4 interfaces. Most likely you want this behind Docker.
# ipv6 => Listen only on IPv6 interfaces.
#
# Note: More information at https://dovecot.org/doc/dovecot-example.conf
DOVECOT_INET_PROTOCOLS=all

# -----------------------------------------------
# --- SpamAssassin Section ----------------------
# -----------------------------------------------

ENABLE_SPAMASSASSIN=0

# KAM is a 3rd party SpamAssassin ruleset, provided by the McGrail Foundation.
# If SpamAssassin is enabled, KAM can be used in addition to the default ruleset.
# - **0** => KAM disabled
# - 1 => KAM enabled
#
# Note: only has an effect if `ENABLE_SPAMASSASSIN=1`
ENABLE_SPAMASSASSIN_KAM=0

# deliver spam messages to the inbox (tagged using SPAM_SUBJECT)
SPAMASSASSIN_SPAM_TO_INBOX=1

# spam messages will be moved in the Junk folder (SPAMASSASSIN_SPAM_TO_INBOX=1 required)
MOVE_SPAM_TO_JUNK=1

# spam messages will be marked as read
MARK_SPAM_AS_READ=0

# add 'spam info' headers at, or above this level
SA_TAG=2.0

# add 'spam detected' headers at, or above this level
SA_TAG2=6.31

# triggers spam evasive actions
SA_KILL=10.0

# -----------------------------------------------
# --- Fetchmail Section -------------------------
# -----------------------------------------------

ENABLE_FETCHMAIL=0

# The interval to fetch mail in seconds
FETCHMAIL_POLL=300
# Use multiple fetchmail instances (1 per poll entry in fetchmail.cf)
# Supports multiple IMAP IDLE connections when a server is used across multiple poll entries
# https://otremba.net/wiki/Fetchmail_(Debian)#Immediate_Download_via_IMAP_IDLE
FETCHMAIL_PARALLEL=0

# Enable or disable `getmail`.
#
# - **0** => Disabled
# - 1 => Enabled
ENABLE_GETMAIL=0

# The number of minutes for the interval. Min: 1; Default: 5.
GETMAIL_POLL=5

# -----------------------------------------------
# --- OAUTH2 Section ----------------------------
# -----------------------------------------------

# empty => OAUTH2 authentication is disabled
# 1 => OAUTH2 authentication is enabled
ENABLE_OAUTH2=

# Specify the user info endpoint URL of the oauth2 provider
# Example: https://oauth2.example.com/userinfo/
OAUTH2_INTROSPECTION_URL=

# -----------------------------------------------
# --- LDAP Section ------------------------------
# -----------------------------------------------

# A second container for the ldap service is necessary (i.e. https://hub.docker.com/r/bitnami/openldap/)

# empty => no
# yes => LDAP over TLS enabled for Postfix
LDAP_START_TLS=

# empty => mail.example.com
# Specify the `<dns-name>` / `<ip-address>` where the LDAP server is reachable via a URI like: `ldaps://mail.example.com`.
# Note: You must include the desired URI scheme (`ldap://`, `ldaps://`, `ldapi://`).
LDAP_SERVER_HOST=

# empty => ou=people,dc=domain,dc=com
# => e.g. LDAP_SEARCH_BASE=dc=mydomain,dc=local
LDAP_SEARCH_BASE=

# empty => cn=admin,dc=domain,dc=com
# => take a look at examples of SASL_LDAP_BIND_DN
LDAP_BIND_DN=

# empty** => admin
# => Specify the password to bind against ldap
LDAP_BIND_PW=

# e.g. `"(&(mail=%s)(mailEnabled=TRUE))"`
# => Specify how ldap should be asked for users
LDAP_QUERY_FILTER_USER=

# e.g. `"(&(mailGroupMember=%s)(mailEnabled=TRUE))"`
# => Specify how ldap should be asked for groups
LDAP_QUERY_FILTER_GROUP=

# e.g. `"(&(mailAlias=%s)(mailEnabled=TRUE))"`
# => Specify how ldap should be asked for aliases
LDAP_QUERY_FILTER_ALIAS=

# e.g. `"(&(|(mail=*@%s)(mailalias=*@%s)(mailGroupMember=*@%s))(mailEnabled=TRUE))"`
# => Specify how ldap should be asked for domains
LDAP_QUERY_FILTER_DOMAIN=

# -----------------------------------------------
# --- Dovecot Section ---------------------------
# -----------------------------------------------

# empty => no
# yes => LDAP over TLS enabled for Dovecot
DOVECOT_TLS=

# e.g. `"(&(objectClass=PostfixBookMailAccount)(uniqueIdentifier=%n))"`
DOVECOT_USER_FILTER=

# e.g. `"(&(objectClass=PostfixBookMailAccount)(uniqueIdentifier=%n))"`
DOVECOT_PASS_FILTER=

# Define the mailbox format to be used
# default is maildir, supported values are: sdbox, mdbox, maildir
DOVECOT_MAILBOX_FORMAT=maildir

# empty => no
# yes => Allow bind authentication for LDAP
# https://doc.dovecot.org/2.4.0/core/config/auth/databases/ldap.html#authentication-bind
DOVECOT_AUTH_BIND=

# -----------------------------------------------
# --- Postgrey Section --------------------------
# -----------------------------------------------

ENABLE_POSTGREY=0
# greylist for N seconds
POSTGREY_DELAY=300
# delete entries older than N days since the last time that they have been seen
POSTGREY_MAX_AGE=35
# response when a mail is greylisted
POSTGREY_TEXT="Delayed by Postgrey"
# whitelist host after N successful deliveries (N=0 to disable whitelisting)
POSTGREY_AUTO_WHITELIST_CLIENTS=5

# -----------------------------------------------
# --- SASL Section ------------------------------
# -----------------------------------------------

ENABLE_SASLAUTHD=0

# empty => ldap
# `ldap` => authenticate against ldap server
# `rimap` => authenticate against imap server
SASLAUTHD_MECHANISMS=

# empty => None
# e.g. with SASLAUTHD_MECHANISMS rimap you need to specify the ip-address/servername of the imap server  ==> xxx.xxx.xxx.xxx
SASLAUTHD_MECH_OPTIONS=

# empty => Use value of LDAP_SERVER_HOST
# Note: You must include the desired URI scheme (`ldap://`, `ldaps://`, `ldapi://`).
SASLAUTHD_LDAP_SERVER=

# empty => Use value of LDAP_BIND_DN
# specify an object with privileges to search the directory tree
# e.g. active directory: SASLAUTHD_LDAP_BIND_DN=cn=Administrator,cn=Users,dc=mydomain,dc=net
# e.g. openldap: SASLAUTHD_LDAP_BIND_DN=cn=admin,dc=mydomain,dc=net
SASLAUTHD_LDAP_BIND_DN=

# empty => Use value of LDAP_BIND_PW
SASLAUTHD_LDAP_PASSWORD=

# empty => Use value of LDAP_SEARCH_BASE
# specify the search base
SASLAUTHD_LDAP_SEARCH_BASE=

# empty => default filter `(&(uniqueIdentifier=%u)(mailEnabled=TRUE))`
# e.g. for active directory: `(&(sAMAccountName=%U)(objectClass=person))`
# e.g. for openldap: `(&(uid=%U)(objectClass=person))`
SASLAUTHD_LDAP_FILTER=

# empty => no
# yes => LDAP over TLS enabled for SASL
# If set to yes, the protocol in SASLAUTHD_LDAP_SERVER must be ldap:// or missing.
SASLAUTHD_LDAP_START_TLS=

# empty => no
# yes => Require and verify server certificate
# If yes you must/could specify SASLAUTHD_LDAP_TLS_CACERT_FILE or SASLAUTHD_LDAP_TLS_CACERT_DIR.
SASLAUTHD_LDAP_TLS_CHECK_PEER=

# File containing CA (Certificate Authority) certificate(s).
# empty => Nothing is added to the configuration
# Any value => Fills the `ldap_tls_cacert_file` option
SASLAUTHD_LDAP_TLS_CACERT_FILE=

# Path to directory with CA (Certificate Authority) certificates.
# empty => Nothing is added to the configuration
# Any value => Fills the `ldap_tls_cacert_dir` option
SASLAUTHD_LDAP_TLS_CACERT_DIR=

# Specify what password attribute to use for password verification.
# empty => Nothing is added to the configuration but the documentation says it is `userPassword` by default.
# Any value => Fills the `ldap_password_attr` option
SASLAUTHD_LDAP_PASSWORD_ATTR=

# empty => `bind` will be used as a default value
# `fastbind` => The fastbind method is used
# `custom` => The custom method uses userPassword attribute to verify the password
SASLAUTHD_LDAP_AUTH_METHOD=

# Specify the authentication mechanism for SASL bind
# empty => Nothing is added to the configuration
# Any value => Fills the `ldap_mech` option
SASLAUTHD_LDAP_MECH=

# -----------------------------------------------
# --- SRS Section -------------------------------
# -----------------------------------------------

# envelope_sender => Rewrite only envelope sender address (default)
# header_sender => Rewrite only header sender (not recommended)
# envelope_sender,header_sender => Rewrite both senders
# An email has an "envelope" sender (indicating the sending server) and a
# "header" sender (indicating who sent it). More strict SPF policies may require
# you to replace both instead of just the envelope sender.
SRS_SENDER_CLASSES=envelope_sender

# empty => Envelope sender will be rewritten for all domains
# provide comma separated list of domains to exclude from rewriting
SRS_EXCLUDE_DOMAINS=

# empty => generated when the image is built
# provide a secret to use in base64
# you may specify multiple keys, comma separated. the first one is used for
# signing and the remaining will be used for verification. this is how you
# rotate and expire keys
SRS_SECRET=

# -----------------------------------------------
# --- Default Relay Host Section ----------------
# -----------------------------------------------

# Setup relaying all mail through a default relay host
#
# Set a default host to relay all mail through (optionally include a port)
# Example: [mail.example.com]:587
DEFAULT_RELAY_HOST=

# -----------------------------------------------
# --- Multi-Domain Relay Section ----------------
# -----------------------------------------------

# Setup relaying for multiple domains based on the domain name of the sender
# optionally uses usernames and passwords in postfix-sasl-password.cf and relay host mappings in postfix-relaymap.cf
#
# Set a default host to relay mail through
# Example: mail.example.com
RELAY_HOST=

# empty => 25
# default port to relay mail
RELAY_PORT=25

# -----------------------------------------------
# --- Relay Host Credentials Section ------------
# -----------------------------------------------

# Configure a relay user and password to use with RELAY_HOST / DEFAULT_RELAY_HOST

# empty => no default
RELAY_USER=

# empty => no default
RELAY_PASSWORD=
```

### 设置 MX、A、AAAA 记录

MX 记录一般设置指向`mail.example.com`，其中`example.com`是你的根域名。

A、AAAA 记录 是指将`mail.example.com`指向你的服务器，即它们的记录值是你的服务器的公网v4、v6地址。

### 设置 PTR 记录（反向解析记录）

华为云搜索反向解析设置，可以看到你的公网v4地址，设置指向`mail.example.com`。

he.net 的则需要在隧道界面，点击rdns上面的那个`x`，选择委派给 he.net dns。 然后在右侧选择 `free dns`。进入，选择ip块地址地址前面的那个`-`，点击，也设置指向`mail.example.com`。

### 运行容器

```shell
docker compose up -d
```

### 设置偏移域名

```shell
docker exec -ti mailserver setup alias add postmaster@example.com user@example.com
```

### 设置 DKIM, DMARC & SPF

设置 DKIM 记录

```shell
docker exec -it mailserver setup config dkim
```

会吐叫你怎么设置 DKIM 的 TXT 记录，照做就行。

设置 DMARC， 即设置`_dmarc.example.com`的 TXT 记录为

```txt
"v=DMARC1; p=quarantine; sp=quarantine; fo=0; adkim=r; aspf=r; pct=100; rf=afrf; ri=86400; rua=mailto:dmarc.report@example.com; ruf=mailto:dmarc.report@example.com"
```

设置 SPF，即设置`example.com`的 TXT 记录为：

```txt
example.com. IN TXT "v=spf1 mx ~all"
```

### 更新容器配置

```shell
docker compose up -d
```

### 设置 TLSA 记录与运行支持 DANE

首先，必须开启 DNSSEC,在 cloudflare 上是在 DNS-设置那里，去你的域名注册商那里要一个，填进去。

其次到你的证书放置处`docker-data/certbot/certs/live/example.com`，输入：

```shell
openssl x509 -in cert.pem -noout -pubkey | openssl pkey -pubin -outform DER | openssl dgst -sha256 -hex | awk '{print $2}'
```

会输出一串数，到 Cloudflare 里为你的 MX 记录指向的域名设置 TLSA， 开头为 3 1 1，值为刚才输出的这一串数。

一切设置完之后在[internet.nl](https://internet.nl/)上应该显示 100 分。

## 测试发件质量

测试网站为[mail-tester](https://www.mail-tester.com/)和[multirbl](https://multirbl.valli.org/)。

华为云的 IP 很干净，就是可能需要去[spamhaus](https://www.spamhaus.org/lookup/)声明一下自己的ip是邮件服务器就行。

## 设置账户密码

```shell
docker exec -ti mailserver setup alias add postmaster@example.com user@example.com
setup email add user@example.com passwd123
```

然后，就开始你的愉快冒险吧，推荐开源邮箱客户端 [ThunderBird](https://www.thunderbird.net/en-US/thunderbird/all/)
