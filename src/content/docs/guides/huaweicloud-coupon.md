---
title: 华为云优惠券活动
description: 本指南介绍了华为云的优惠券活动信息，包括如何获取和使用华为云的各类折扣优惠券
---

**活动报名链接**：[云原生认证集证有礼活动-含AFF](https://edu.huaweicloud.com/signup/a84b127961f4408bb69d560f48c5675d?medium=share_kfzlb&invitation=fc8fbc9c020b47728b8c37f0c3165d0d)

**注意，你至少需要一台电脑和三天每天一小时来完成这些）**,完成需要8元+24元可以获得一台1C2G30M的华为新加坡服务器大约40个月的使用权限。

理论考试偏技术性问题，直接全部问`gemini 2.5pro`能一遍过，放我和`gemini`的问答记录不如你直接自己问，因此就不放理论考试题目了

开虚拟机或者远程桌面或者云电脑或者`scrcpy`连接手机防切屏检测，推荐搭配chrome插件：[超级复制](https://chromewebstore.google.com/detail/supercopy-%E8%B6%85%E7%BA%A7%E5%A4%8D%E5%88%B6/onepmapfbjohnegdmfhndpefjkppbjkm)，直接就能复制，省的ocr题目

## 防切屏检测油猴脚本

<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=114390263141630&bvid=BV1xmLvzwEJi&cid=29578825715&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>

[油猴插件下载链接](https://microsoftedge.microsoft.com/addons/detail/%E7%AF%A1%E6%94%B9%E7%8C%B4/iikmkjmpaadaobahmlepeloendndfphd?hl=zh-CN)

```javascript
// ==UserScript==
// @name         通用阻止切屏检测
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  尝试阻止各类网站的切屏、焦点丢失等检测
// @author       nodeseek@小号 && Gemini
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        unsafeWindow
// @license      GPL-3.0
// ==/UserScript==

(function () {
    'use strict';
    const window = unsafeWindow; // 使用原始 window 对象

    // 黑名单事件，这些事件的监听器将被阻止
    const blackListedEvents = new Set([
        "visibilitychange", // 页面可见性改变
        "blur",             // 元素或窗口失去焦点
        "focus",            // 元素或窗口获得焦点 (某些检测可能反向利用focus)
        "pagehide",         // 页面隐藏（例如导航到其他页面）
        "freeze",           // 页面被冻结 (较新的事件)
        "resume",           // 页面从冻结状态恢复 (较新的事件)
        "mouseleave",       // 鼠标移出元素（通常是 document 或 body）
        "mouseout",         // 鼠标移出元素（更通用的移出，但要小心副作用）
        // "focusout",      // 元素将要失去焦点（与blur类似，但更通用，看情况添加）
        // "focusin",       // 元素将要获得焦点（与focus类似，看情况添加）
    ]);

    // 白名单属性，这些属性在 document 对象上将被伪造
    const spoofedDocumentProperties = {
        hidden: { value: false, configurable: true },
        mozHidden: { value: false, configurable: true }, // Firefox (旧版)
        msHidden: { value: false, configurable: true },  // Internet Explorer
        webkitHidden: { value: false, configurable: true }, // Chrome, Safari, Opera (旧版 Blink/WebKit)
        visibilityState: { value: "visible", configurable: true },
        hasFocus: { value: () => true, configurable: true }
    };

    // 需要清空/置空的事件处理器属性 (on-event handlers)
    const eventHandlersToNullifyDocument = [
        "onvisibilitychange",
        "onblur",
        "onfocus",
        "onmouseleave",
        "onmouseout",
        // "onfocusout",
        // "onfocusin",
        "onpagehide",
        "onfreeze",
        "onresume"
    ];

    const eventHandlersToNullifyWindow = [
        "onblur",
        "onfocus",
        "onpagehide",
        "onpageshow", // 有些检测可能通过 pageshow 结合 persisted 属性判断
        "onfreeze",
        "onresume",
        "onmouseleave", // window 也有 onmouseleave
        "onmouseout"
    ];

    const isDebug = false; // 设置为 true 以启用调试日志
    const scriptPrefix = "[通用阻止切屏检测]";
    const log = console.log.bind(console, `%c${scriptPrefix}`, 'color: #4CAF50; font-weight: bold;');
    const warn = console.warn.bind(console, `%c${scriptPrefix}`, 'color: #FFC107; font-weight: bold;');
    const error = console.error.bind(console, `%c${scriptPrefix}`, 'color: #F44336; font-weight: bold;');
    const debug = isDebug ? log : () => { };

    /**
     * 伪装函数的 toString 方法，使其看起来像原始函数。
     * @param {Function} modifiedFunction 被修改的函数
     * @param {Function} originalFunction 原始函数
     */
    function patchToString(modifiedFunction, originalFunction) {
        if (typeof modifiedFunction !== 'function' || typeof originalFunction !== 'function') {
            warn("patchToString: 传入的参数不是函数。", modifiedFunction, originalFunction);
            return;
        }
        try {
            const originalToStringSource = Function.prototype.toString.call(originalFunction);
            modifiedFunction.toString = () => originalToStringSource;

            // 进一步伪装 toString.toString
            const originalToStringToStringSource = Function.prototype.toString.call(originalFunction.toString);
            Object.defineProperty(modifiedFunction.toString, 'toString', {
                value: () => originalToStringToStringSource,
                enumerable: false,
                configurable: true, // 保持可配置，以防万一
                writable: false
            });
            debug(`patchToString applied for: ${originalFunction.name || 'anonymous function'}`);
        } catch (e) {
            error("patchToString failed:", e, "for function:", originalFunction.name);
        }
    }


    /**
     * 劫持并修改对象的 addEventListener 方法。
     * @param {EventTarget} targetObject 要劫持的对象 (window, document, Element)
     * @param {string} objectName 用于日志记录的对象名称
     */
    function patchAddEventListener(targetObject, objectName) {
        if (!targetObject || typeof targetObject.addEventListener !== 'function') {
            warn(`Cannot patch addEventListener for invalid target: ${objectName}`);
            return;
        }
        const originalAddEventListener = targetObject.addEventListener;

        targetObject.addEventListener = function (type, listener, optionsOrCapture) {
            if (blackListedEvents.has(type.toLowerCase())) {
                log(`BLOCKED ${objectName}.addEventListener: ${type}`);
                return undefined; // 阻止添加黑名单中的事件监听器
            }
            debug(`ALLOWED ${objectName}.addEventListener: ${type}`, listener, optionsOrCapture);
            return originalAddEventListener.call(this, type, listener, optionsOrCapture);
        };

        patchToString(targetObject.addEventListener, originalAddEventListener);
        log(`${objectName}.addEventListener patched.`);
    }

    /**
     * 劫持并修改对象的 removeEventListener 方法 (可选，但建议一起修改)。
     * @param {EventTarget} targetObject 要劫持的对象
     * @param {string} objectName 用于日志记录的对象名称
     */
    function patchRemoveEventListener(targetObject, objectName) {
        if (!targetObject || typeof targetObject.removeEventListener !== 'function') {
            warn(`Cannot patch removeEventListener for invalid target: ${objectName}`);
            return;
        }
        const originalRemoveEventListener = targetObject.removeEventListener;

        targetObject.removeEventListener = function (type, listener, optionsOrCapture) {
            if (blackListedEvents.has(type.toLowerCase())) {
                log(`Original call to ${objectName}.removeEventListener for blacklisted event '${type}' would have been ignored by our addEventListener patch anyway. Allowing native call if needed.`);
                // 即使我们阻止了 addEventListener，原始的 removeEventListener 仍然应该能安全调用
                // 因为如果监听器从未被添加，调用 remove 也无害。
            }
            debug(`PASSTHROUGH ${objectName}.removeEventListener: ${type}`, listener, optionsOrCapture);
            return originalRemoveEventListener.call(this, type, listener, optionsOrCapture);
        };
        patchToString(targetObject.removeEventListener, originalRemoveEventListener);
        log(`${objectName}.removeEventListener patched.`);
    }


    /**
     * 修改对象上的属性，使其返回伪造的值。
     * @param {object} targetObject 目标对象 (e.g., document)
     * @param {object} propertiesToSpoof 属性描述对象
     * @param {string} objectName 对象名称
     */
    function spoofProperties(targetObject, propertiesToSpoof, objectName) {
        if (!targetObject) {
            warn(`Cannot spoof properties for invalid target: ${objectName}`);
            return;
        }
        for (const prop in propertiesToSpoof) {
            if (Object.prototype.hasOwnProperty.call(propertiesToSpoof, prop)) {
                try {
                    Object.defineProperty(targetObject, prop, propertiesToSpoof[prop]);
                    debug(`Spoofed ${objectName}.${prop}`);
                } catch (e) {
                    error(`Failed to spoof ${objectName}.${prop}:`, e);
                }
            }
        }
        log(`${objectName} properties spoofed.`);
    }

    /**
     * 清空或置空对象上的事件处理器属性。
     * @param {object} targetObject 目标对象
     * @param {string[]} eventHandlerNames 事件处理器名称数组
     * @param {string} objectName 对象名称
     */
    function nullifyEventHandlers(targetObject, eventHandlerNames, objectName) {
        if (!targetObject) {
            warn(`Cannot nullify event handlers for invalid target: ${objectName}`);
            return;
        }
        eventHandlerNames.forEach(handlerName => {
            try {
                Object.defineProperty(targetObject, handlerName, {
                    get: () => {
                        debug(`Access to ${objectName}.${handlerName} (get), returning undefined.`);
                        return undefined;
                    },
                    set: (newHandler) => {
                        log(`Attempt to set ${objectName}.${handlerName} blocked.`);
                        if (typeof newHandler === 'function') {
                             // 可以选择性地调用 newHandler，或者完全阻止
                             // debug(`(Blocked) Handler function was:`, newHandler);
                        }
                    },
                    configurable: true // 保持可配置，以便脚本可以多次运行或被其他脚本修改
                });
                debug(`Nullified ${objectName}.${handlerName}`);
            } catch (e) {
                error(`Failed to nullify ${objectName}.${handlerName}:`, e);
            }
        });
        log(`${objectName} on-event handlers nullified.`);
    }

    // --- 开始执行 ---

    log("Script starting...");

    // 1. 劫持 window 和 document 的 addEventListener/removeEventListener
    patchAddEventListener(window, "window");
    patchRemoveEventListener(window, "window"); // 也 patch removeEventListener 以保持一致性
    patchAddEventListener(document, "document");
    patchRemoveEventListener(document, "document");

    // 2. 修改 document 的属性
    spoofProperties(document, spoofedDocumentProperties, "document");

    // 3. 置空 document 和 window 上的事件处理器
    nullifyEventHandlers(document, eventHandlersToNullifyDocument, "document");
    nullifyEventHandlers(window, eventHandlersToNullifyWindow, "window");

    // 4. 对于 document.body，需要等待 DOMContentLoaded
    // 使用 MutationObserver 确保 body 存在时立即 patch，比 DOMContentLoaded 更早且更可靠
    const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
            patchAddEventListener(document.body, "document.body");
            patchRemoveEventListener(document.body, "document.body");
            // 对于 document.body，也可以考虑 nullify onmouseleave, onmouseout 等
            nullifyEventHandlers(document.body, ["onmouseleave", "onmouseout", "onblur", "onfocus"], "document.body");
            log("document.body patched via MutationObserver.");
            obs.disconnect(); // 完成任务后断开观察者
        }
    });

    if (document.body) { // 如果 body 已经存在 (不太可能在 document-start，但以防万一)
        patchAddEventListener(document.body, "document.body");
        patchRemoveEventListener(document.body, "document.body");
        nullifyEventHandlers(document.body, ["onmouseleave", "onmouseout", "onblur", "onfocus"], "document.body");
        log("document.body patched directly.");
    } else {
        observer.observe(document.documentElement || document, { childList: true, subtree: true });
    }


    // 5. 调试：劫持计时器 (如果 isDebug 为 true)
    if (isDebug) {
        const originalSetInterval = window.setInterval;
        window.setInterval = function(...args) {
            const id = originalSetInterval.apply(this, args);
            debug("calling window.setInterval", id, args);
            return id;
        };
        patchToString(window.setInterval, originalSetInterval);

        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(...args) {
            const id = originalSetTimeout.apply(this, args);
            debug("calling window.setTimeout", id, args);
            return id;
        };
        patchToString(window.setTimeout, originalSetTimeout);
        log("Timer functions (setInterval, setTimeout) wrapped for debugging.");
    }

    log("Script execution finished. Monitoring active.");

})();
```

`实验考试`操作就是`docker` `kubectl` 那些命令，不会也能问gemini，下面放了题目，如果有不懂的直接扔给ai让生成命令就行
前5个认证都有实验考试，不通过实验考试证书不会生成，38的微认证都没有实验考试

考试要求你有一定的linux命令基础，如果你对docker、vim、ssh、scp等命令不熟悉，多问问AI，下文中不对vim的操作做说明，有空可以把微认证学习课程里的实验做了

## 有些槽点

1. 实验考试的云服务器默认安全组没开22端口，要先去安全组放行，建议直接`一键放通常用端口`，省事

2. 容器拉不下来，要配置镜像地址
`华为云控制台`-`容器镜像服务 SWR`-`镜像资源`-`镜像中心`-`镜像加速器` 可直接复制命令配置华为源
![35d4b60fbab8a05cf3d2ca0ee0530c382827bfb6.jpeg](https://image.kafuchino.top/api/rfile/35d4b60fbab8a05cf3d2ca0ee0530c382827bfb6.jpeg)

但是华为源有的镜像还没有，我用的`1panel`的镜像源：

```bash
sudo vim /etc/docker/daemon.json
```

```json
{
  "registry-mirrors": ["https://docker.1panel.live"]
}
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info
```

3. `kubectl`配置文件可以这样上传：

```bash
# 在下载文件夹右键打开终端
user@sandbox:~/Downloads$ ls
cce-k8s-kubeconfig.yaml
user@sandbox:~/Downloads$ realpath cce-k8s-kubeconfig.yaml
/home/user/Downloads/cce-k8s-kubeconfig.yaml
user@sandbox:~/Downloads$ scp /home/user/Downloads/cce-k8s-kubeconfig.yaml root@xxx.xxx.xxx.xx:/home
root@xxx.xxx.xxx.xxx's password: 
cce-k8s-kubeconfig.yaml                       100% 5882     1.7MB/s   00:00    
user@sandbox:~/Downloads$ 
```

4. 云数据库RDS安全组也没放开，记得放端口（如果内网不能访问就直接绑定弹性IP）

5. 不知道官方故意还是写错了，写的镜像niginx:1.7.9，不过不影响考试步骤，就按niginx:1.7.9来吧

6. 如果你对`云容器引擎 CCE`云服务的购买不熟悉，可以看看华为云官方的步骤：[在CCE集群中部署NGINX无状态工作负载](https://support.huaweicloud.com/intl/zh-cn/qs-cce/cce_qs_0003.html#section2)

7. CCE实验中`ecs-terminal`指的是云服务器，要去华为云`控制台`->`弹性云服务器 ECS`查看服务器IP并ssh登录执行kubectl的相关操作

8. 再强调一下，下文中的`ecs-terminal`指的都是云服务器，要去网页华为云控制台找到ip并放行22端口后，在桌面终端通过`ssh root@xx.xx.xx.xx`连接，桌面终端的唯一作用就是用来连接ssh，不要在桌面终端进行kubectl的相关操作!因为评分是根据ESC服务器上的内容评判的，你在桌面终端上弄就算输出和截图一致也是不给分的。

9. 根据评论反馈，**现在有部分题目要求有所改动，请以实际题目为准**，实验考试的任务要求`gemini 2.5 pro`都能答出来，详细步骤可以多问问AI

### 附实验考试题目和AI答案（人工进行了订正，如有错误请再问AI详细的命令）

-------

## 云原生基础设施之容器入门

-------

首先操作，前往弹性云服务器ECS放通安全组端口，ssh登录服务器后换docker镜像源，后文不再提示

任务1：dockerfile构建容器镜像

得分点：能正确创建名为httpd:v1的镜像，并正常运行。

其中dockerfile的部分参数如下：

```txt
① 基础镜像：httpd

② 维护者：123@huawei.com

③ 端口：80

④ 运行命令：echo "dockerfile test"/usr/local/apache2/htdocs/index.html
```

⑤ 以下为dockerfile模板，可根据此模板修改内容：

```dockerfile
FROM centos:centos7
MAINTAINER Iris@huawei.com
EXPOSE 80
RUN yum install -y httpd vi && yum clean all
```

使用docker run以该镜像运行容器，并借助-p参数指定访问端口为80。在浏览器内输入<http://EIP:80。出现`dockerdile> test`文字则证明任务完成。

本任务中需注意以下内容：

（1）使用错误的命名不得分

（2）多或者少开放端口不得分

**任务1步骤：**

1. 创建 `Dockerfile` 文件（无后缀名），内容如下：

```dockerfile
FROM httpd
MAINTAINER 123@huawei.com
EXPOSE 80
RUN echo "dockerfile test" > /usr/local/apache2/htdocs/index.html
```

2. 在 `Dockerfile` 文件所在目录，执行构建命令：

```bash
docker build -t httpd:v1 .
```

3. 运行容器：

```bash
docker run -d -p 80:80 httpd:v1
```

4. 验证：在浏览器内输入 `http://宿主机EIP:80` (宿主机EIP指运行Docker的机器的公网IP)。如果显示 "dockerfile test" 则成功。

-------

任务2：搭建私有镜像仓库

得分点：成功创建私有镜像仓库并且成功上传镜像.

1.搭建私有镜像仓库，私有镜像仓库服务监听端口为5000。修改容器`httpd:v1`的镜像名称后，将该容器上传至私有镜像仓库。

2.在终端输入`curl -X GET http://localhost:5000/v2/httpd/tags/list`命令查看仓库镜像信息。出现`{"name":"httpd","tags":["v1"]}`结果，任务完成。

本任务中需注意以下内容：

（1）使用错误的镜像仓库监听端口不得分

（2）使用错误的镜像名称不得分

**任务2步骤：**

1. 运行私有镜像仓库容器 (registry):

```bash
docker run -d -p 5000:5000 --restart=always --name registry registry:2
```

2. 标记

```txt
httpd:v1
```

镜像以上传到私有仓库 (假设私有仓库地址为localhost:5000，如果Docker宿主机本身无法解析localhost作为仓库地址，可能需要使用宿主机实际IP；对于某些Docker版本，可能需要配置insecure-registries)：

```bash
docker tag httpd:v1 localhost:5000/httpd:v1
```

注意：如果Docker守护进程未配置信任 `localhost:5000` 为非安全仓库，推送会失败。您可能需要修改Docker的 `daemon.json` 文件，例如在 `/etc/docker/daemon.json` 中添加 `{"insecure-registries" : ["localhost:5000"]}` 并重启Docker服务。

3. 上传镜像到私有仓库：

```bash
docker push localhost:5000/httpd:v1
```

4. 验证仓库中的镜像信息：

```bash
curl -X GET http://localhost:5000/v2/httpd/tags/list
```

预期输出：

```shell
{"name":"httpd","tags":["v1"]}
```

-------

任务3：容器生命周期管理

得分点：成功完成生命周期管理任务。

对httpd:v1容器及镜像执行暂停、恢复、停止、重启、删除镜像、删除镜像的操作。

输入：docker rmi httpd:v1命令，出现：Untagged: httpd:v1则证明任务完成

本任务中需注意以下内容：

（1）输入至错误文件、输入非要求内容不得分

**任务3步骤：**

1. 首先确保有一个基于

```txt
httpd:v1
```

运行的容器（如果上一步骤中已运行，请获取其容器ID或名称；如果未运行，则先运行）：

```bash
docker run -d --name my_httpd_v1 httpd:v1
```

假设容器名称为

```
my_httpd_v1
```

暂停容器：

```bash
docker pause my_httpd_v1
```

2. 恢复容器：

```bash
 docker unpause my_httpd_v1
```

3. 停止容器：

```bash
 docker stop my_httpd_v1
```

4. 重启容器 (此步骤中容器处于停止状态，重启会使其重新运行；如果想演示对运行中容器的重启，可以先

```
docker start my_httpd_v1
```

 再

```
docker restart my_httpd_v1
```

5. 停止并删除容器（删除镜像前必须先删除使用该镜像的容器，或者先停止容器）：

如果还有其他基于 `httpd:v1` 或 `localhost:5000/httpd:v1` 的容器，也需要先停止并删除它们。

6. 删除本地的私有仓库镜像标签 (如果任务2已执行)：

```bash
 docker rmi localhost:5000/httpd:v1
```

7. 删除

```
httpd:v1
```

镜像：

```bash
docker rmi httpd:v1
```

预期输出包含：

```
Untagged: httpd:v1
```

-------

## 云原生基础设施之容器进阶

-------

任务1：使用cgroup实现资源限制

得分点：能对容器实现CPU限制。

运行压力测试容器progrium/stress，限制CPU使用率为70%（可输入top命令验证结果）。

在终端`/sys/fs/cgroup/cpu/docker/`容器ID/文件夹下，输入命令`cat cpu.cfs_quota_us`。

显示70000则证明成功。

本任务中需注意以下内容：

（1）使用错误的限额比例不得分

（2）输入非`cat cpu.cfs_quota_us`的错误命令不得分

**任务1步骤：**

1. 拉取progrium/stress压力测试镜像：(注意镜像源配置)

```bash
docker pull progrium/stress
```

2. 运行容器，限制CPU使用率 (例如，分配70%的一个核心)：

```bash
docker run -d --name my_stress --cpu-period=100000 --cpu-quota=70000 progrium/stress --cpu 1
```

3. 获取容器的完整ID：

```bash
docker ps --no-trunc | grep my_stress
# 或者 docker inspect --format='{{.Id}}' my_stress
```

记下输出的完整容器ID。

4. 进入cgroup目录并查看

```bash
cd /sys/fs/cgroup/cpu/docker/[容器完整ID]
cat cpu.cfs_quota_us
```

预期输出：

```
70000
```

-------

**注：最新任务改为要求拉取ubuntu，请按实际要求操作，下方命令已修正，原centos命令写在注释中**

任务2：搭建容器bridge网络

得分点：成功搭建bridge网络并达成容器网络互通。

1.创建用户自定义网桥，指定子网为173.18.0.0/16，网关为173.18.0.1。

2.运行两个centos容器并挂载到自定义网桥。

3.进入任意一个容器，在容器内ping另一个容器的ip地址。出现以下结果，任务完成。

输入：ping 173.18.0.2命令（此命令可以多输几次），返回下图内容

本任务中需注意以下内容：

（1）建议提前拉取centos镜像

**任务2步骤：**

1. 提前拉取ubuntu(centos)镜像 (如果未拉取)：

```bash
docker pull ubuntu:latest
# docker pull centos:latest
```

2. 创建用户自定义网桥：  

```bash
docker network create --subnet=173.18.0.0/16 --gateway=173.18.0.1 my_bridge_network
```

3. 运行第一个ubuntu容器并连接到自定义网桥，指定IP（可选，Docker会自动分配，但为了方便测试可以指定，确保IP在子网范围内且未被占用）：  

```bash
 docker run -dit --name ubuntu1 --network my_bridge_network --ip 173.18.0.2 ubuntu:latest /bin/bash
```

4. 运行第二个ubuntu容器并连接到自定义网桥，指定IP：  

```bash
 docker run -dit --name ubuntu2 --network my_bridge_network --ip 173.18.0.3 ubuntu:latest /bin/bash
```

5. 进入第二个容器 `ubuntu2`

```bash
docker exec -it ubuntu2 /bin/bash
```

6. 在第二个容器 `ubuntu2`中安装ping工具

```bash
apt update
apt install -y iputils-ping
```

7. 在

```
ubuntu2
```

 内部，ping

```
ubuntu1
```

 的IP地址 (173.18.0.2)。

```bash
# 首先需要安装ping工具（如果CentOS最小镜像不包含）
# 在container1的shell中
# yum install -y iputils
ping 173.18.0.2
```

预期会看到ping通的回复。按

```
Ctrl+C
```

 停止ping。然后输入

```
exit
```

 退出容器。

------

任务3：容器挂载存储卷

得分点：成功挂载volume并实现持久化存储。

使用docker managed volume挂载到容器，在容器内输入echo "this is page from docker managed volume. " index.html。删除该容器。

在宿主机挂载原路径中通过cat index.html命令查看文件内容，出现“this is page from docker managed volume.”则任务完成。

本任务中需注意以下内容：

（1）可使用任意镜像完成该实验，如httpd、centos镜像等

**任务3步骤：**

1. 创建一个Docker managed volume：  

```bash
 docker volume create my_volume
```

2. 运行一个容器 例如使用

```bash
ubuntu
#centos
```

并将

```
my_volume
```

挂载到容器内的路径

```
/app
```

```bash
docker run -d --name volume_test_container -v my_volume:/app ubuntu:latest tail -f /dev/null
# tail -f /dev/null是为了让容器保持运行状态，方便执行
 ```

3. 在容器内创建文件并写入内容：

```bash
docker exec volume_test_container bash -c 'echo "this is page from docker managed volume." /app/index.html'
```

4. 验证文件内容

```bash
docker exec  -it ubuntu /bin/bash
#  进入容器
cat app/index.html
```

5. 删除容器：  

```bash
 docker stop volume_test_container
 docker rm volume_test_container
```

6. 查看Docker managed volume在宿主机上的实际存储路径（此步骤是为了理解，通常不直接操作此路径，但题目要求“在宿主机挂载原路径中”）：  

```bash
 docker volume inspect my_volume
```

 记下

 ```
Mountpoint
 ```

  字段的值，例如

 ```
/var/lib/docker/volumes/my_volume/_data
 ```

7. 在宿主机上，查看该路径下的文件内容 (将

```
[Mountpoint路径]
```

 替换为上一步获取到的路径)：

```bash
cd var/lib/docker/volumes/my_volume/_data/
cat index.html
```

预期输出：

```
this is page from docker managed volume.
```

------

## 云容器快速搭建网站

------

**注：这个实验全程不需要使用终端，一直都是在控制台购买各种服务，如果你不知道怎么买，就去看看官方教程：[在CCE集群中部署NGINX无状态工作负载](https://support.huaweicloud.com/intl/zh-cn/qs-cce/cce_qs_0003.html#section2)**

任务1：创建RDS数据库

得分点：能正确创建RDS for MySQL数据库服务。

部分参数请参考以下内容：

计费模式：按需计费

区域：华北-北京四

实例名称：rds-web（请使用该名称，否则影响任务得分）

数据库引擎：MySQL

数据库版本：5.7

实例类型：单机

存储类型：默认

可用区：默认

性能规格：通用型|2核|4GB

存储空间：40GB

虚拟私有云：选择已预置的虚拟私有云

所在子网：选择已预置的子网

安全组：选择已预置的安全组

本任务中需注意以下内容：

（1） 创建了错误的规格，不得分

（2） RDS创建成功后，需自行创建一个新的数据库、账号、密码，并完成授权，作为后续实验的环境变量使用

**任务1步骤：**

可以**先做任务2**，因为创建CCE集群时间比较长；这个没什么好说的，按要求创建服务就行(云数据库 RDS-购买数据库实例-**自定义购买**)，记得放行端口号，可以绑个弹性IP，省的内网可能访问不到数据库

如果你创建完数据库就被删除，说明你购买的规格不符合任务要求，我没有遇到过这个问题，再仔细看看任务要求的规格，注意一定要选**自定义购买**

------

任务2：完成CCE集群的创建，并成功添加Node节点。

得分点：成功添加指定规格的Node节点。

创建CCE集群部分参数请参考以下内容：

计费模式：按需计费

区域：华北-北京四

集群名称：test（请使用该名称，否则影响任务得分）

版本：选择最新版即可

集群管理规模：50节点

高可用：否

虚拟私有云：选择已创建的虚拟私有云，如myvpc

所在子网：选择已创建的子网，如subnet-myvpc

网络模型：容器隧道网络

容器网段：自动选择

IPV4服务网段：使用默认网段

高级配置：暂不配置

插件配置：取消“容器监控”及“业务日志”

创建节点，设置参数参考如下：

计费方式：按需计费

当前区域：华北-北京四

可用区：默认

节点类型：弹性云服务器-虚拟机

容器引擎：默认

节点规格：通用型|s6.xlarge.2|4核|8GB

操作系统：EulerOS 2.9

节点名称：test-node

登录方式：密码（自行设置复杂密码）

存储配置：高IO，其余保持默认

虚拟私有云：选择已预置的vpc和子网

节点IP：随机分配

弹性公网IP：自动创建

计费方式：按流量计费，带宽5M

节点购买数量：1台

其余设置保持默认

本任务中需注意以下内容：

（1） 在新版CCE界面下执行操作任务

（2） 错误的节点规格不得分

**任务1步骤：**

没什么好说的，按要求创建服务就行，以下是AI生成的步骤

此任务通过华为云CCE（云容器引擎）控制台完成。

1. 登录华为云控制台。

2. 导航到“云容器引擎 CCE”服务。

3. 创建集群  ：

- 点击“购买Kubernetes集群”。
- **计费模式**：按需计费
- **区域**：华北-北京四
- **集群名称**：test
- **版本**：选择最新版
- **集群管理规模**：50节点
- **高可用**：否
- **虚拟私有云(VPC)**：选择已创建的虚拟私有云 (如myvpc)
- **所在子网**：选择已创建的子网 (如subnet-myvpc)
- **网络模型**：容器隧道网络
- **容器网段**：自动选择
- **IPV4服务网段**：使用默认网段
- **高级配置**：暂不配置
- **插件配置**：取消勾选“容器监控”和“业务日志”
- 确认配置并创建集群骨架（控制面）。

4. 等待集群控制面创建成功。

5. 创建节点

(在集群管理界面，选择对应集群，点击“节点管理” -“创建节点”)：

- **计费方式**：按需计费

- **当前区域**：华北-北京四

- **可用区**：默认 (或根据实际情况选择)

- **节点类型**：弹性云服务器-虚拟机

- **容器引擎**：默认

- **节点规格**：通用型 | s6.xlarge.2 | 4核 | 8GB

- **操作系统**：EulerOS 2.9

- **节点名称**：test-node

- **登录方式**：密码 (自行设置复杂密码)

- **系统盘/数据盘存储配置**：系统盘通常为高IO，大小默认或按需；数据盘根据需要（题目中为高IO，其余默认）。

- **虚拟私有云**：选择已预置的VPC和子网 (应与集群VPC一致)

- **节点IP**：随机分配

- 弹性公网IP

  ：自动创建

  - **计费方式**：按流量计费
  - **带宽**：5Mbit/s

- **节点购买数量**：1台

- 其余设置保持默认。

6. 确认配置并创建节点。等待节点成功添加到集群。

------

任务3：通过华为云镜像中心部署无状态工作负载WordPress，并通过外网访问WordPress页面。

得分点：能通过<http://ip:端口号成功访问网站登录页面。>

WordPress无状态工作负载的创建参数如下：

负载名称：wordpress

实例数量：1

镜像版本：php7.3

WordPress访问类型：LoadBalancer

访问端口：80

容器端口：80

此外需要设置环境变量，此处一共需要设置四个环境变量：

WORDPRESS_DB_HOST：数据库内网IP地址:端口号

WORDPRESS_DB_USER：（与前面mysql创建的账号名称一致）

WORDPRESS_DB_PASSWORD：（与前面mysql创建的账号时设置的密码一致）

WORDPRESS_DB_NAME：（与前面mysql创建的数据库名称一致）

**任务3步骤：**

1. 确保CCE集群（名为`test`）和RDS数据库（名为`rds-web`）已按前述任务要求创建并准备就绪。获取任务1中创建的RDS数据库的内网IP地址、端口号、数据库名、用户名和密码。

2. 在CCE控制台，选择`test`集群。

3. 导航到“工作负载” -“无状态负载 (Deployments)”
![966be74d-b836-4d90-8afb-8bc51cce9e08.png](https://image.kafuchino.top/api/rfile/966be74d-b836-4d90-8afb-8bc51cce9e08.png)

4. 配置工作负载：

- **负载名称**：wordpress

- **实例数量**：1

- 容器配置    ：

  - 点击“选择镜像”。
  - 镜像来源选择“华为云SWR镜像”（或公共镜像，搜索WordPress）。题目指定“镜像版本：php7.3”，需要找到对应的WordPress镜像，例如 `wordpress:php7.3` 。
  - **容器端口**：80

- 环境变量

  (非常重要)：

  - 添加以下四个环境变量：（注意安全组放行3306）
    - `WORDPRESS_DB_HOST` = `[RDS数据库内网IP地址]:[RDS端口号]` (例如 `192.168.1.10:3306`)
    - `WORDPRESS_DB_USER` = `[任务1中创建的RDS用户名]`
    - `WORDPRESS_DB_PASSWORD` = `[任务1中创建的RDS用户密码]`
    - `WORDPRESS_DB_NAME` = `[任务1中创建的RDS数据库名]`

- 访问设置 (服务)：

  - **访问类型**：LoadBalancer ，即负载均衡(弹性公网IP)
  - **协议**：TCP
  - **容器端口**：80
  - **访问端口 (服务端口)**：80![Selected](https://image.kafuchino.top/api/rfile/5d113fed-f893-451a-b351-c71d467a7b90.png)

5. 检查其他配置，然后点击“创建负载”。

6. 等待工作负载和LoadBalancer类型的服务创建完成。服务创建完成后，在“服务发现与负载均衡 (Services)”或“网络” -“服务 (Services)”部分找到名为`wordpress`（或类似）的服务。

7. 获取该服务的外部IP地址（弹性公网IP）。![Selected](https://image.kafuchino.top/api/rfile/cf3deb2b-4c86-4eee-af75-d13bb88f741f.png)

8. 在浏览器中输入 `http://[外部IP地址]:80`。应能看到WordPress的安装或登录页面。![22badb70-21a2-4121-a019-426267d646fd.png](https://image.kafuchino.top/api/rfile/22badb70-21a2-4121-a019-426267d646fd.png)

------

## CCE网络与存储实战

------

任务1：创建CCE集群

得分点：能按要求成功配置CCE集群

提示：集群创建预计需要10分钟左右，可以单击“返回集群管理”进行其它操作或单击“查看集群事件列表”后查看集群详情。为**节约时间，可在集群创建期间进入任务2，进行kubectl的安装操作。**

1. CCE集群的配置参数如下： 计费模式: 按需付费 区域:华为-北京四 集群名称: cce-k8s 自定义版本: V1.21 集群管理规模: 50节点 网络模型: 容器隧道网络 虚拟私有云: vpc-cce（已预置） 控制节点子网: subnet-cce（已预置） 容器网段: 勾选"自动选择" 服务网段: 使用默认网段 其余参数: 保持默认
2. CCE集群下创建节点： 计费模式: 按需付费 节点规格：c6s.xlarge.2  4核|8GB 操作系统：选择公共 镜像EulerOS 2.5 节点名称：cce-k8s-node-01 登录方式：选择“密码”，此处建议使用：Huawei@1234 系统盘/数据盘：高IO，40G 虚拟私有云所在子网，选择默认子网 弹性公网IP：选择“自动创建” 规格：全动态BGP 计费模式：按流量计费， 带宽大小 ：5M 其余参数保持默认即可 任务中需注意以下内容： （1）按需购买资源，并按指导参数配置CCE集群，否则不得分。 （2）若规定节点规格有售罄情况，请选择相近规格ECS作为集群Node节点。

**任务1步骤：**

此任务通过华为云CCE控制台完成。

1. 登录华为云控制台。

2. 导航到“云容器引擎 CCE”服务。

3. 创建集群控制面  ：

- 点击“购买Kubernetes集群”或“创建集群”。
- **计费模式**: 按需付费
- **区域**: 华为-北京四
- **集群名称**: cce-k8s
- **版本**: 自定义版本 V1.21 (若控制台界面有变，选择最接近的或指定版本)
- **集群管理规模**: 50节点
- **网络模型**: 容器隧道网络
- **虚拟私有云(VPC)**: vpc-cce (选择已预置)
- **控制节点子网**: subnet-cce (选择已预置)
- **容器网段**: 勾选 "自动选择"
- **服务网段**: 使用默认网段
- **其余参数**: 保持默认
- 确认并创建集群控制面。

4. 等待集群控制面创建成功。

5. 创建节点

(在集群管理界面，选择

```
cce-k8s
```

集群，点击“节点管理” -“创建节点”或“添加节点”)：

- **计费模式**: 按需付费

- **节点规格**：c6s.xlarge.2 (4核 | 8GB)

- **操作系统**：选择公共镜像 EulerOS 2.5

- **节点名称**：cce-k8s-node-01

- **登录方式**：选择“密码”，密码设置为 `Huawei@1234`

- **系统盘**: 高IO，40G

- **数据盘**: 高IO，40G (题目中系统盘/数据盘一起描述，通常指系统盘40G，数据盘也设置为40G高IO，或根据界面具体选项调整)

- **虚拟私有云所在子网**：选择默认子网 (应为`vpc-cce`下的可用子网)

- 弹性公网IP

  ：选择“自动创建”

  - **规格**：全动态BGP
  - **计费模式**：按流量计费
  - **带宽大小**：5Mbit/s

- **其余参数**: 保持默认

6. 确认配置并创建节点。等待节点成功加入集群。

------

任务2：安装并配置kubectl

得分点：能在ecs-terminal中正确安装kubectl客户端

提示：kubectl具体的安装步骤以及配置文件的下载路径可参考：“CCE集群 集群信息 连接信息 kubectl>点击查看 ”

提示：下载的json文件默认放置在以下路径： /home/user/Downloads/kubeconfig.json

kubectl客户端（v1.19.10）的下载链接如下： <https://dl.k8s.io/v1.19.10/kubernetes-client-linux-amd64.tar.gz>

kubectl安装并配置完成后，使用以下命令验证其安装结果：

kubectl get node

若回显如下，则表示安装配置成功：

任务中需注意以下内容：

（1）kubectl应配置于ecs-terminal，否则不得分

（2）使用kubectl get node 后若不返回node节点信息则不得分

**任务2步骤：**

**此任务在 ecs-terminal (华为云的云服务器ECS) 中执行。**

1. 登录到 `ecs-terminal`。

2. 下载kubectl客户端 (v1.19.10)：

```bash
wget https://dl.k8s.io/v1.19.10/kubernetes-client-linux-amd64.tar.gz
```

3. 解压下载的压缩包：

```bash
tar -zxvf kubernetes-client-linux-amd64.tar.gz
```

4. 将kubectl二进制文件移动到系统路径下，例如

```
/usr/local/bin
```

```bash
sudo mv kubernetes/client/bin/kubectl /usr/local/bin/
sudo chmod +x /usr/local/bin/kubectl
```

5. 验证kubectl版本：

```bash
kubectl version --client
```

6. 配置kubectl连接集群  

- 在华为云CCE控制台，选择 `cce-k8s` 集群。

- 导航到 “概览” -“连接信息” -“配置”，点击查看。![68010913d427e1aa23ee38802f14fceb.png](https://image.kafuchino.top/api/rfile/68010913d427e1aa23ee38802f14fceb.png)

- 按照指引下载 `kubeconfig.json` 文件。用scp命令传到服务器上

  ```bash
  # 在下载文件夹右键打开终端
  user@sandbox:~/Downloads$ ls
  cce-k8s-kubeconfig.yaml
  user@sandbox:~/Downloads$ realpath cce-k8s-kubeconfig.yaml
  /home/user/Downloads/cce-k8s-kubeconfig.yaml
  user@sandbox:~/Downloads$ scp /home/user/Downloads/cce-k8s-kubeconfig.yaml root@xx.xx.xx.xx:/home
  root@xxx.xxx.xx.xx's password: 
  cce-k8s-kubeconfig.yaml                       100% 5882     1.7MB/s   00:00    
  user@sandbox:~/Downloads$ 
  ```

- 登录到您的客户端机器，配置 kubectl 配置文件

  ```bash
  cd /home
  mkdir -p $HOME/.kube
  mv -f cce-k8s-kubeconfig.yaml $HOME/.kube/config
  # VPC网络内接入访问请执行此命令
  kubectl config use-context internal
  # 互联网接入访问请执行此命令（需绑定公网地址）
  # kubectl config use-context external
  # 设置完成后，可以通过以下命令查看 Kubernetes 集群信息
  kubectl cluster-info
  kubectl get node
  # 显示如下说明安装成功
  [root@ecs-terminal home]# kubectl get node
  NAME            STATUS   ROLES    AGE     VERSION
  192.168.0.108   Ready    <none  3m51s   v1.31.4-r0-31.0.5.8
  ```

------

任务3：创建Deployment

得分点：按照指示在执行机上查看创建后的Deployment

于CCE集群cce-k8s创建如下Deployment工作负载：

创建Service实1验使用的目录：labfile/servicefile

后端nginx Deployment： nginx-deploy.yaml

nginx-deploy.yaml代码如下：

apiVersion: apps/v1

kind: Deployment

metadata:

name: nginx

spec:

replicas: 3

selector:

matchLabels:

app: nginx

template:

metadata:

labels:

app: nginx

spec:

containers:

\- name: nginx

image: nginx

ports:

\- containerPort: 80

提示：

kubectl命令语法：kubectl [command] [TYPE] [NAME] [flags]

Command：指定希望进行的操作，如create，get，describe，delete等。

TYPE：指定操作对象的类型，如deployment，pod，service等。

NAME：指定对象的名字。

flags: 可选的标志位。如--namespace=xxx, --image=xxx等。

**任务3步骤：**

在 ecs-terminal (已配置好kubectl) 中执行。

1. 创建目录 (题目要求在此目录下操作)：

```bash
 mkdir -p labfile/servicefile
 cd labfile/servicefile
```

2. 创建  文件

```
vim nginx-deploy.yaml
```

内容如下：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx # 默认使用nginx:latest
        ports:
        - containerPort: 80
```

3. 使用kubectl应用该yaml文件创建Deployment：

```bash
 kubectl apply -f nginx-deploy.yaml
```

4. 查看创建的Deployment：

```bash
kubectl get deployment nginx
# 或者查看pod状态
# kubectl get pods -l app=nginx
```

预期会看到名为

```
nginx
```

 的Deployment，并且有3个副本正在创建或已运行。

------

任务4：创建service服务

得分点：在CCE控制台-服务发现-服务中查看到nginx-svc

创建nginx-service.yaml

创建service

查看service中的endpoints

nginx-service.yaml代码如下：

```yaml
apiVersion: v1

kind: Service

metadata:

name: nginx-svc

spec:

selector:

app: nginx

ports:

protocol: TCP port: 8080 targetPort: 80
```

**任务4步骤：**

在 ecs-terminal (已配置好kubectl，建议在 labfile/servicefile 目录下) 中执行。

1. 创建文件

```
vim nginx-service.yaml
```

内容如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx # 这个selector要匹配上一步Deployment中Pod的label
  ports:
  - protocol: TCP
    port: 8080      # Service暴露的端口
    targetPort: 80  # Pod内容器实际监听的端口
  # type: ClusterIP # 默认为ClusterIP，如果需要外部访问，可以改为NodePort或LoadBalancer，但题目未指定
```

2. 使用kubectl应用该yaml文件创建Service：

```bash
 kubectl apply -f nginx-service.yaml
```

3. 查看创建的Service：

```bash
 kubectl get service nginx-svc
```

4. 查看Service的Endpoints (这会显示Service关联到的Pod的IP和端口)：

```bash
kubectl get endpoints nginx-svc
```

 预期会看到与

 ```
nginx
 ```

  Deployment中3个Pod对应的IP地址和端口。

5. 验证：登录华为云CCE控制台，进入 `cce-k8s` 集群，在“服务发现”或“网络” -“服务 (Services)”中应能查看到名为 `nginx-svc` 的服务。

------

## 基于CCE Kubernetes编排实战

------

实验一：创建CCE集群及创建节点

任务1：创建CCE集群及创建节点

得分点：能按要求成功配置CCE集群

提示：集群创建预计需要10分钟左右，可以单击 “查看集群事件列表”后查看集群详情。为节约时间，可在集群创建期间进入实验二，进行kubectl的安装操作。

1. CCE集群的配置参数如下，其余参数请保持默认。 计费模式: 按需付费 区域:华为-北京四 集群名称: 请命名为cce-k8s，否则无法进行验证 集群版本: 选择推荐的版本 集群管理规模: 50节点 集群Master数：单节点 虚拟私有云: vpc-cce（实验已预置） 网络模型: 容器隧道网络 容器网段: 选择“自动设置网段” 服务网段: 使用默认网段 插件选择：关闭云原生监控插件 其余参数: 保持默认
2. 节点配置参数如下，其余参数请保持默认。 计费模式：按需付费 可用区：选择“随机分配” 节点名称：自定义节点名称，建议使用cce-k8s-node-01 节点规格：c6s.xlarge.2，4核|8GB 容器引擎：Containerd 操作系统：选择“公共镜像EulerOS 2.9” 系统盘：高IO，40GiB 数据盘：高IO，100GiB 虚拟私有云所在子网：选择默认子网 弹性IP：选择“自动创建” 规格：全动态BGP 计费模式：按流量计费 带宽大小 ：5M 登录方式：选择“密码”，自定义登录密码 本任务中需注意按需购买资源，并按指导参数配置CCE集群，否则不得分。

**任务1步骤：**

略，以下AI生成

此任务通过华为云CCE控制台完成。

1. 登录华为云控制台。

2. 导航到“云容器引擎 CCE”服务。

3. 创建集群控制面

- 点击“购买Kubernetes集群”或“创建集群”。
- **计费模式**: 按需付费
- **区域**: 华为-北京四
- **集群名称**: cce-k8s (务必使用此名称)
- **集群版本**: 选择推荐的版本
- **集群管理规模**: 50节点
- **集群Master数**: 单节点
- **虚拟私有云(VPC)**: vpc-cce (选择实验已预置)
- **网络模型**: 容器隧道网络
- **容器网段**: 选择“自动设置网段”
- **服务网段**: 使用默认网段
- **插件选择**: 关闭云原生监控插件
- **其余参数**: 保持默认
- 确认并创建集群控制面。

4. 等待集群控制面创建成功。

5. 创建节点

(在集群管理界面，选择

```
cce-k8s
```

集群，点击“节点管理” -“创建节点”或“添加节点”)：

- **计费模式**: 按需付费

- **可用区**: 选择“随机分配”

- **节点名称**: 自定义，建议 `cce-k8s-node-01`

- **节点规格**: c6s.xlarge.2 (4核 | 8GB)

- **容器引擎**: Containerd

- **操作系统**: 选择“公共镜像 EulerOS 2.9”

- **系统盘**: 高IO，40GiB

- **数据盘**: 高IO，100GiB

- **虚拟私有云所在子网**: 选择默认子网 (应为`vpc-cce`下的可用子网)

- 弹性公网IP

  : 选择“自动创建”

  - **规格**: 全动态BGP
  - **计费模式**: 按流量计费
  - **带宽大小**: 5Mbit/s

- **登录方式**: 选择“密码”，自定义登录密码。

- **其余参数**: 保持默认

6. 确认配置并创建节点。等待节点成功加入集群。

------

实验二：使用kubectl操作CCE集群

任务1：安装并配置kubectl

得分点：能在ecs-terminal中正确安装kubectl客户端。

提示信息如下：

1. kubectl具体的安装步骤以及配置文件的下载路径可参考：“CCE控制台 集群管理 集群cce-k8s 连接信息 kubectl”
2. kubectl客户端安装完成后，其配置文件所在路径：kubernetes/client/bin/kubectl (此为kubectl二进制文件路径，配置文件通常是kubeconfig)
3. kubectl客户端的下载链接如下： <https://sandbox-experiment-files.obs.cn-north-4.myhuaweicloud.com/1993/kubernetes-client-linux-amd64.tar.gz>
4. kubectl安装并配置完成后，使用以下命令验证其安装结果： kubectl get node 若回显如下，则表示安装配置成功： 本任务中需注意以下内容： kubectl应配置于ecs-terminal，否则不得分 使用kubectl get node 后若不返回node节点信息则不得分

**任务2步骤：**

**此任务在 ecs-terminal (华为云的云服务器ECS) 中执行。**

1. 登录到 `ecs-terminal`。

2. 下载kubectl客户端 (v1.19.10)：

```bash
wget https://dl.k8s.io/v1.19.10/kubernetes-client-linux-amd64.tar.gz
```

3. 解压下载的压缩包：

```bash
tar -zxvf kubernetes-client-linux-amd64.tar.gz
```

4. 将kubectl二进制文件移动到系统路径下，例如

```
/usr/local/bin
```

```bash
sudo mv kubernetes/client/bin/kubectl /usr/local/bin/
sudo chmod +x /usr/local/bin/kubectl
```

5. 验证kubectl版本：  

```bash
kubectl version --client
```

6. 配置kubectl连接集群  

- 在华为云CCE控制台，选择 `cce-k8s` 集群。

- 导航到 “概览” -“连接信息” -“配置”，点击查看。![68010913d427e1aa23ee38802f14fceb.png](https://image.kafuchino.top/api/rfile/68010913d427e1aa23ee38802f14fceb.png)

- 按照指引下载 `kubeconfig.json` 文件。用scp命令传到服务器上

  ```bash
  # 在下载文件夹右键打开终端
  user@sandbox:~/Downloads$ ls
  cce-k8s-kubeconfig.yaml
  user@sandbox:~/Downloads$ realpath cce-k8s-kubeconfig.yaml
  /home/user/Downloads/cce-k8s-kubeconfig.yaml
  user@sandbox:~/Downloads$ scp /home/user/Downloads/cce-k8s-kubeconfig.yaml root@xx.xx.xx.xx:/home
  root@xxx.xxx.xxx's password: 
  cce-k8s-kubeconfig.yaml                       100% 5882     1.7MB/s   00:00    
  user@sandbox:~/Downloads$ 
  ```

- 登录到您的客户端机器，配置 kubectl 配置文件

  ```bash
  cd /home
  mkdir -p $HOME/.kube
  mv -f cce-k8s-kubeconfig.yaml $HOME/.kube/config
  # VPC网络内接入访问请执行此命令
  kubectl config use-context internal
  # 互联网接入访问请执行此命令（需绑定公网地址）
  # kubectl config use-context external
  # 设置完成后，可以通过以下命令查看 Kubernetes 集群信息
  kubectl cluster-info
  kubectl get node
  # 显示如下说明安装成功
  [root@ecs-terminal home]# kubectl get node
  NAME            STATUS   ROLES    AGE     VERSION
  192.168.0.108   Ready    <none  3m51s   v1.31.4-r0-31.0.5.8
  ```

------

任务2：创建并使用名为“production”的namespace

得分点：于预制CCE集群创建指定namespace

于CCE集群cce-k8s创建namespace，命名为production

本任务中需注意：namespace命名不匹配不得分

**任务2步骤：**

在 ecs-terminal (已配置好kubectl) 中执行。

1. 创建名为

```
production
```

 的namespace：

```bash
kubectl create namespace production
```

2. 验证创建（可选）：

```bash
kubectl get namespace production
```

预期输出：

```
NAME STATUS AGE
```

```
production Active ...s
```

------

任务3：创建并使用名为“testing”的namespace

得分点：于预制CCE集群创建指定namespace

于CCE集群cce-k8s创建namespace命名为testing

本任务中需注意：namespace命名不匹配不得分

**任务3步骤：**

在 ecs-terminal (已配置好kubectl) 中执行。

1. 创建名为

```
testing
```

 的namespace：

```bash
kubectl create namespace testing
```

2. 验证创建（可选）：

```bash
kubectl get namespace testing
```

预期输出：

```
NAME STATUS AGE
```

```
testing Active ...s
```

------

实验三：在CCE集群中部署Deployment工作负载

任务1：使用Deployment部署Nginx

得分点：按照要求成功创建Deployment负载

提示信息如下：

kubectl命令语法：kubectl [command] [TYPE] [NAME] [flags]

Command：指定希望进行的操作，如create，get，describe，delete等。

TYPE：指定操作对象的类型，如deployment，pod，service等。

NAME：指定对象的名字。

flags: 可选的标志位。如--namespace=xxx, --image=xxx等。

于CCE集群cce-k8s创建如下Deployment工作负载：

名称：nginx

命名空间：production

副本数：2

镜像：niginx:1.7.9 (注意：此处可能是笔误，通常为 nginx)

本任务中需注意：名称、命名空间、副本、镜像版本若不匹配均不得分。

**任务1步骤：**

在 ecs-terminal (已配置好kubectl) 中执行。

 注：这里官方给的镜像是niginx，疑似笔误，但拉取镜像失败不影响得分，可以直接按题目要求使用niginx，如果你介意这个可以使用nginx，未验证是否影响得分

1. 使用kubectl命令直接创建Deployment： (假设 "niginx" 为笔误，实际应为 "nginx"。如果题目严格要求 "niginx"，则使用 "niginx")

```bash
kubectl create deployment nginx --image=nginx:1.7.9 --replicas=2 --namespace=production
```

如果严格按照题目中的 "niginx":

```bash
kubectl create deployment nginx --image=niginx:1.7.9 --replicas=2 --namespace=production
```

2. 验证Deployment是否成功创建并在指定命名空间中：

```bash
kubectl get deployment nginx --namespace=production
```

预期输出应显示名为

```
nginx
```

 的Deployment，DESIRED为2，CURRENT为2 (可能需要一点时间达到)，READY为2。

3. 查看Pod状态：

```bash
kubectl get pods --namespace=production -l app=nginx 
# kubectl create deployment 会自动给pod打上 app=nginx 的标签
```

预期会看到两个Pod正在运行或创建中。

------

任务2：更新Deployment

得分点：按照要求更新任务1已创建的Deployment负载

提示：以下命令可用于Deployment的更新

$ kubectl edit deployment

$ kubectl scale deployment

$ kubectl set image deployment

按照以下要求更新已创建的Deployment：

副本数：2 -3

镜像：niginx:1.7.9 -niginx:1.9.1 (注意：此处可能是笔误，通常为 nginx)

本任务中需注意：若Deployment负载的副本数、镜像版本未按要求更新则不得分。

**任务2步骤：**

在 ecs-terminal (已配置好kubectl) 中执行。

1. 更新副本数从2到3 (针对名为 `nginx` 的Deployment，在 `production` 命名空间)：

```bash
kubectl scale deployment nginx --replicas=3 --namespace=production
```

2. 更新镜像版本从 nginx:1.7.9 (或 niginx:1.7.9) 到 nginx:1.9.1 (或 niginx:1.9.1)：

*不知道官方故意还是写错了，写的镜像niginx:1.7.9，不过不影响考试步骤，就按niginx:1.7.9来吧，看你喜欢哪个命令*

(假设 "niginx" 为笔误，实际应为 "nginx"。如果题目严格要求 "niginx"，则使用 "niginx")

```bash
kubectl set image deployment/nginx nginx=nginx:1.9.1 --namespace=production
# 如果Deployment中的容器名不是nginx，而是例如 my-nginx-container，则用 my-nginx-container=nginx:1.9.1
# 通常 kubectl create deployment nginx 会创建一个名为 nginx 的容器
```

如果严格按照题目中的 "niginx":

```bash
kubectl set image deployment/nginx niginx=niginx:1.9.1 --namespace=production 
# 这里的 nginx= 是指容器的名字，如果创建时容器名不同，需要相应修改
```

**为了确保容器名正确，可以先 `kubectl describe deployment nginx -n production` 查看容器名。通常 `kubectl create deployment <name>` 会创建一个名为 `<name>` 的容器。**

3. 验证更新后的Deployment状态：

```bash
kubectl get deployment nginx --namespace=production
```

预期输出应显示 `nginx` Deployment，DESIRED为3，CURRENT为3，READY为3 (可能需要一点时间完成更新)。

4. 验证Pod的镜像版本 (可以抽查一个Pod)：

```bash
kubectl describe pod [pod名称] --namespace=production | grep Image:
# 先用 kubectl get pods -n production 获取一个新创建的Pod名称
```

预期Image字段显示为 `nginx:1.9.1` (或 `niginx:1.9.1`)。
*我这里镜像没拉成功，但还是100分通过了，这个镜像名称是nginx:1.9.1应该没影响*

## 购买机器

只能购买新加坡机器（你也不想被提示地区不支持还得在 VPS 上架梯子吧），链接为：[Flexus应用服务器L实例 特惠来袭](https://activity.huaweicloud.com/hecs-light-ancu.html?fromacct=5ee5a09594d542f8ae4fd940604fd1e7&utm_source=&utm_medium=&utm_campaign=)

选择新加坡，可以选最便宜的，但是建议选那个1G内存的，多不了几块钱，这种活动应该还很多，实验酒馆本身会占200M左右内存，建议多预留一点。

开一个月之后等优惠券到账了就可以续费了，不赘述。

**提示**：新加坡机器的线路不同，可以到[itdog](https://itdog.cn)上去tcping你的机器的ip，正常应该类似如下，不对就多开几台到这样为止，再把多的退掉（别先退，要不然ip不会变）
![华为云测速结果](https://i.miji.bid/2025/03/13/1b45933b036108d1a755b42bf0342656.jpeg)