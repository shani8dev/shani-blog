---
slug: kubernetes-on-shani-os
title: 'Kubernetes on Shani OS — From a Single Node to a Production-Grade Cluster'
date: '2026-05-05'
tag: 'Guide'
excerpt: 'Shani OS and Kubernetes are built for each other. Immutable OS root, Btrfs subvolumes, and fully decoupled lifecycles make it the ideal base for running k3s, RKE2, and the full modern stack — Cilium, ArgoCD, Longhorn, cert-manager, and beyond.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '12 min'
series: 'Shani OS Guides'
---

Podman on Shani OS handles everything you need on a single host — containers, compose stacks, rootless workloads. But at some point the limits show up. You need more than one machine. You need a deployment that replaces pods without downtime. You need automatic failover when a node dies. You need a CI pipeline that can promote a change from dev to staging to production with a rollback built in. That's when you reach for Kubernetes.

The good news is that Shani OS is one of the cleanest bases for Kubernetes you'll find. This post explains why, and walks through everything from a two-minute single-node install to what a production setup actually looks like — pointing to the [full reference wiki](https://docs.shani.dev/doc/servers/kubernetes) for the details that belong there.

---

## Why Shani OS and Kubernetes Fit Each Other

The thing that matters most is the immutable OS root. Shani OS keeps the system partition read-only. Kubernetes data lives in dedicated Btrfs subvolumes: `@containers` for runtime state and `@home` for your kubeconfigs, manifests, and Helm values. Those subvolumes are completely independent of the OS.

This means:

- A `shani-update` never touches your cluster state.
- A Kubernetes upgrade never touches the OS.
- An OS rollback doesn't break etcd. A cluster reset doesn't touch your home directory.

On a conventional mutable distro, an OS package update can silently break kubelet or containerd. On Shani OS, the two lifecycles are genuinely separate. That's not a small thing when you're running production workloads.

There's also a practical wrinkle worth knowing up front: the curl-based installers for k3s, k0s, and RKE2 default to writing binaries into `/usr/local/bin`, which is on the read-only root. All three support an environment variable that redirects them to `~/.local/bin` instead. Make sure that path is in your shell's `PATH`:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
```

The [wiki covers this for each distribution](https://docs.shani.dev/doc/servers/kubernetes#distributions) with the exact install commands.

---

## Before You Install

Two kernel settings need to be applied once. Every Kubernetes distribution requires them:

```bash
# Minimum memory map count — required by Elasticsearch, SonarQube, and K8s itself
sudo sysctl -w vm.max_map_count=524288
echo "vm.max_map_count=524288" | sudo tee /etc/sysctl.d/99-k8s.conf

# Bridge netfilter — required for pod networking on most CNIs
sudo modprobe br_netfilter
echo "br_netfilter" | sudo tee /etc/modules-load.d/br_netfilter.conf
```

RAM minimums: 512 MB for k3s on a single node, 2 GB for most other distributions, 4 GB+ recommended when running the full stack (monitoring, ingress, GitOps).

---

## Choosing a Distribution

The honest answer for most people is **k3s**. It's a fully conformant, CNCF-certified Kubernetes in a single binary under 70 MB. It ships with containerd, CoreDNS, and a local-path provisioner. It installs in under two minutes and handles everything from a homelab media stack to a production workload with multiple nodes.

Here's a quick map of the full landscape:

| Distribution | Best for | RAM minimum |
|---|---|---|
| **k3s** | Single-node homelab, edge, most use cases | 512 MB |
| **k0s** | Minimal footprint, embedded systems | 1 GB |
| **MicroK8s** | Addon-driven, snap-managed | 2 GB |
| **minikube** | Local dev, Podman driver | 2 GB |
| **kind** | CI pipelines, ephemeral clusters | 2 GB |
| **RKE2** | Hardened production, CIS compliance | 4 GB |
| **Talos Linux** | Immutable, API-only, no SSH | 2 GB |
| **kubeadm** | Upstream reference, CKA study | 2 GB |

**RKE2** is the right choice when you need CIS Kubernetes Benchmark compliance and DISA STIG readiness out of the box. **kubeadm** is for when you want to understand exactly what every distribution is building on top of — it's also the standard for CKA/CKS exam prep. **Talos** takes the Shani OS philosophy to its logical extreme at the node level: immutable, API-only, no shell, no SSH; every operation goes through `talosctl`.

Full install commands for all distributions — including HA control planes, worker node joins, and upgrade procedures — are in the [Distributions section of the wiki](https://docs.shani.dev/doc/servers/kubernetes#distributions).

---

## k3s: The Fastest Path to a Working Cluster

For most people this is the right starting point. Install it with Cilium as the CNI (more on why Cilium below) by disabling the built-in Flannel:

```bash
mkdir -p ~/.local/bin
curl -sfL https://get.k3s.io | INSTALL_K3S_BIN_DIR=~/.local/bin sh -s - \
  --flannel-backend=none \
  --disable-kube-proxy \
  --disable-network-policy \
  --disable=traefik

mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config && chmod 600 ~/.kube/config

kubectl get nodes
```

That's a running cluster. Adding worker nodes is a two-command operation — get the token from the server, run the agent installer on each worker with `K3S_URL` and `K3S_TOKEN` set. The [k3s section](https://docs.shani.dev/doc/servers/kubernetes#k3s) has the exact commands, etcd snapshot management, and drain/uncordon procedures.

---

## The CLI Tools You'll Actually Use

Install everything through Nix (the primary package manager on Shani OS):

```bash
nix-env -iA nixpkgs.kubectl nixpkgs.kubernetes-helm nixpkgs.k9s \
  nixpkgs.argocd nixpkgs.fluxcd nixpkgs.velero nixpkgs.kubeseal \
  nixpkgs.cilium-cli nixpkgs.hubble nixpkgs.krew nixpkgs.helmfile \
  nixpkgs.cosign nixpkgs.trivy nixpkgs.linkerd
```

A note: `k9s` on Snap is unmaintained — always install it via Nix. `kubectl` and `helm` are available via Snap as a fallback if needed. The [Disk Layout & CLI Tools section](https://docs.shani.dev/doc/servers/kubernetes#disk-layout--cli-tools) also covers the krew plugin manager, which gives you `kubectl ctx`, `kubectl ns`, `kubectl tree`, `kubectl df-pv`, and a handful of other plugins that make daily operations much faster.

---

## Networking: Why Cilium

k3s ships with Flannel as its default CNI. Flannel works, but it's L3-only with no observability and no policy beyond basic NetworkPolicy. The recommended stack replaces it with **Cilium** — and also replaces kube-proxy entirely.

Cilium is built on eBPF, which means it operates at the Linux kernel level without iptables. It's significantly faster under load, enforces L7 HTTP/gRPC/DNS-aware network policies that standard NetworkPolicy can't express, provides transparent WireGuard encryption between nodes, and includes **Hubble** — a real-time network flow observer that lets you watch exactly which pods are talking to what, see dropped packets, and debug policy denials live.

The difference between a standard NetworkPolicy and a CiliumNetworkPolicy is substantial. Standard policies are L3/L4 only: you can block or allow traffic by namespace, pod label, and port. Cilium policies go deeper — you can write rules that allow only specific HTTP methods to specific URL paths, or restrict which external domains a pod can call by FQDN:

```yaml
# Standard NetworkPolicy can't do this — Cilium can
# Lock a backend pod to only accept GET /api/* from the frontend
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: /api/.*
```

For bare-metal LoadBalancer services (so you get real IPs, not just NodePort), Cilium's built-in `CiliumLoadBalancerIPPool` + `CiliumL2AnnouncementPolicy` handles simple homelab setups without MetalLB.

Everything — Cilium install values, WireGuard config, Hubble setup, Flannel migration, L7 policies, DNS-aware egress policies, and firewall ports for multi-node clusters — is in the [Networking & Ingress section](https://docs.shani.dev/doc/servers/kubernetes#networking--ingress).

---

## Ingress: The Gateway API

The Kubernetes `Ingress` resource is being superseded by the **Gateway API**, and the recommended ingress controller for this stack is **NGINX Gateway Fabric (NGF)** — NGINX's native Gateway API implementation with no annotations, clean HTTPRoute/GRPCRoute resources, and per-route policies for rate limiting, timeouts, and OpenTelemetry tracing.

The architecture on Shani OS: Caddy terminates TLS on the host and forwards plain HTTP to NGF via a NodePort:

```
Browser → HTTPS → Caddy (host, :443)
                   → HTTP → localhost:30080 (NGF NodePort)
                              → HTTPRoute → application pods
```

This keeps TLS management in Caddy (where it integrates with your internal CA or Let's Encrypt via `tls internal`) and keeps Kubernetes ingress configuration clean. The one thing to remember: always add `header_up Host {host}` in your Caddy `reverse_proxy` block, otherwise NGF gets `localhost` as the Host header and can't match any HTTPRoute.

The [Networking & Ingress section](https://docs.shani.dev/doc/servers/kubernetes#nginx-gateway-fabric-ngf) has the full NGF install, NodePort patch, Gateway/HTTPRoute/GRPCRoute examples, ReferenceGrant setup for cross-namespace routing, and NGF version compatibility matrix.

---

## TLS: cert-manager

cert-manager handles certificate provisioning and renewal automatically. Point it at Let's Encrypt for public domains, your internal Step-CA for `*.home.local`, or Cloudflare DNS-01 for wildcard certs:

```bash
helm repo add cert-manager https://charts.jetstack.io
helm upgrade --install cert-manager cert-manager/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

From there you create a `ClusterIssuer` (one per CA), annotate your Ingress or reference the Certificate in your HTTPRoute, and cert-manager handles everything else — including renewal before expiry. The [TLS section](https://docs.shani.dev/doc/servers/kubernetes#tls--certificate-management) covers HTTP-01, DNS-01 via Cloudflare, and internal Step-CA issuers with full YAML.

---

## Storage

A bare cluster has no persistent storage beyond the node's local disk. For multi-node clusters, you need a storage layer so that PVCs can follow pods around.

**Longhorn** is the recommended starting point for k3s and RKE2 homelabs. It provides replicated block storage across nodes — each PVC gets a volume with configurable replica count, backed by local disks. The Longhorn UI gives you a live view of replica health and lets you trigger backups to S3. Enable iSCSI first, then install:

```bash
nix-env -iA nixpkgs.open-iscsi && sudo systemctl enable --now iscsid

helm repo add longhorn https://charts.longhorn.io
helm upgrade --install longhorn longhorn/longhorn \
  --namespace longhorn-system --create-namespace \
  --set defaultSettings.defaultReplicaCount=2
```

For workloads that need `ReadWriteMany` (multiple pods on different nodes sharing one volume), the NFS Subdir External Provisioner is the simplest path in a homelab. For production-grade distributed storage with S3-compatible object storage and CephFS, **Rook-Ceph** is the answer.

**MinIO** deserves a mention here too: it's the self-hosted S3 replacement used as the backend for Velero backups, Loki log storage, and Tempo trace storage. Light enough to run in-cluster, compatible with every AWS S3 SDK.

Full setup for all of these — including how to set Longhorn as the default StorageClass, PVC resize, and the Caddy reverse proxy entries for each UI — is in the [Storage](https://docs.shani.dev/doc/servers/kubernetes#storage), [NFS & Shared Storage](https://docs.shani.dev/doc/servers/kubernetes#nfs--shared-storage), and [MinIO](https://docs.shani.dev/doc/servers/kubernetes#minio-self-hosted-s3) sections.

---

## Security: The Minimum You Actually Need

A cluster that accepts any workload without policy is a liability. These are the tools that matter:

**Pod Security Admission (PSA)** is built into Kubernetes 1.25+ and enforces security profiles at the namespace level with nothing more than labels. The `restricted` profile requires non-root containers and a read-only root filesystem. Apply it to production namespaces:

```bash
kubectl label namespace myapp \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest
```

**Kyverno** is the policy engine for everything else — written as YAML CRDs, no Rego required. Use it to require resource limits on all pods, block privileged containers, enforce image signing, and auto-generate a default-deny NetworkPolicy for every new namespace you label as `managed: "true"`. It's simpler than OPA/Gatekeeper for most teams and integrates cleanly with the rest of this stack.

**Falco** watches every syscall via eBPF and fires alerts when something unexpected happens at runtime — a shell spawned inside a container, an unexpected outbound connection, a privilege escalation attempt. It integrates with Falcosidekick to route alerts to Slack, ntfy, or PagerDuty.

For secrets: never put plaintext values in YAML, even in private repos. **Sealed Secrets** encrypts secrets for safe Git storage — the in-cluster controller decrypts them at apply time. **External Secrets Operator** syncs secrets from OpenBao, Infisical, HashiCorp Vault, or any major cloud secrets manager into native Kubernetes `Secret` objects on a refresh interval. The wiki has the full setup for both, including a ClusterSecretStore for OpenBao and Infisical.

The [Security & Policy section](https://docs.shani.dev/doc/servers/kubernetes#security--policy) covers RBAC, PSA, SecurityContext hardening, Kyverno, OPA/Gatekeeper, and Falco. The [Secrets Management section](https://docs.shani.dev/doc/servers/kubernetes#secrets-management) covers Sealed Secrets and ESO with full YAML for multiple backends.

---

## GitOps: The Operational Model That Makes This All Manageable

Running Kubernetes without GitOps is painful. You apply manifests manually, you lose track of what's running, rollbacks are scary because you're not sure what state you were in. With GitOps, Git becomes the source of truth for cluster state. Changes are commits. Rollbacks are `git revert`. Every deployment is auditable.

The end-to-end workflow looks like this:

```
Developer pushes to feature branch
  → CI runs tests, builds image via Kaniko, pushes to Harbor
  → CI signs image with Cosign
  → CI updates image tag in the GitOps manifests repo
  → ArgoCD detects the diff and syncs the cluster
  → Argo Rollouts performs a canary: 5% → 50% → 100%
  → Prometheus checks error rate during each canary window
  → Healthy → promote. Degraded → automatic rollback.
```

**ArgoCD** is the standard for this stack. Install it:

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd --create-namespace \
  --set server.service.type=ClusterIP

kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Then point an `Application` CRD at your manifests repo and set `syncPolicy.automated`. From that point, every commit to the manifests repo automatically deploys. The App-of-Apps pattern lets a single root Application manage a directory of child Applications — one for each service, one for monitoring, one for ingress. The ApplicationSet resource generates Applications dynamically from a Git directory listing or a list of clusters.

**Flux CD** is the alternative if you prefer a CLI-first approach with tighter Helm and Kustomize integration and no separate UI. Both are excellent; choose based on your team's preferences.

**Kargo** sits between CI and ArgoCD and adds ordered promotion pipelines: a new image tag can only move from dev → staging → prod after each stage passes a verification step. Approval gates, rollback, and multi-source freight tracking are all built in.

The [GitOps & Continuous Delivery section](https://docs.shani.dev/doc/servers/kubernetes#gitops--continuous-delivery) covers ArgoCD, Flux, Kargo, Kustomize overlays for multi-environment config, and Flux Image Automation. The [Advanced GitOps Patterns section](https://docs.shani.dev/doc/servers/kubernetes#advanced-gitops-patterns) covers App-of-Apps, ApplicationSets, and Flux HelmRelease/Kustomization CRDs.

---

## Progressive Delivery: Canaries Without the Fear

The four deployment strategies, in brief:

| Strategy | Traffic split | Rollback speed | Cost |
|---|---|---|---|
| **Rolling Update** | Gradual pod replacement | Seconds | 1× |
| **Blue/Green** | 100% flip | Instant | 2× |
| **Canary** | Percentage-based, metric-gated | Automatic | ~1.1× |
| **Feature Flags** | Per-user in-app | Instant | 1× |

**Argo Rollouts** replaces the standard `Deployment` with a `Rollout` CRD and adds canary and blue/green strategies with Prometheus-gated analysis. A canary that automatically rolls back when error rate exceeds 1% is genuinely achievable in a few lines of YAML. The [Progressive Delivery section](https://docs.shani.dev/doc/servers/kubernetes#progressive-delivery) has full examples for both strategies.

---

## Image Supply Chain: Harbor, Cosign, and Trivy

Production clusters should be running images that come from a known registry, have been scanned for vulnerabilities, and are cryptographically signed.

**Harbor** is the self-hosted OCI registry that handles all of this. It has built-in Trivy scanning (every image scanned on push automatically), RBAC, robot accounts for CI, and image replication. If you just need a minimal registry for homelab or air-gapped use, **Zot** is a far lighter alternative — a ~50 MB Go binary with no external dependencies.

**Cosign** signs images after they're built. Signatures are stored in the registry alongside the image. Pair it with a Kyverno `verifyImages` policy and only cryptographically signed images from your Harbor registry will be admitted to production namespaces.

**Trivy** scans images, Helm charts, Kubernetes manifests, and Terraform configs for vulnerabilities and misconfigurations. The **Trivy Operator** runs continuously in-cluster and surfaces `VulnerabilityReport` and `ConfigAuditReport` resources that you can query with `kubectl`. **Conftest** and **kubeconform** run in CI to catch policy violations and schema errors before they ever reach the cluster.

The [Image Supply Chain Security section](https://docs.shani.dev/doc/servers/kubernetes#image-supply-chain-security) covers all of this — Harbor install, robot account creation, Cosign signing in CI, Kyverno `verifyImages`, and Trivy Operator.

---

## Observability: Three Pillars and a Fourth

The standard stack covers all three observability pillars plus network flows:

**Metrics** — `kube-prometheus-stack` installs Prometheus, Alertmanager, Grafana, and all the necessary exporters and dashboards in one Helm chart. Pre-built Grafana dashboard IDs for Cilium (18814), Longhorn (13032), ArgoCD (14584), Loki (13639), and OpenCost (15714) mean you import by ID and have dashboards immediately.

**Logs** — Loki indexes only labels, not full log content, keeping storage costs low. Grafana Alloy (the successor to Promtail + Grafana Agent) ships logs from every pod on every node to Loki. Query with LogQL in Grafana alongside your Prometheus metrics.

**Traces** — The OpenTelemetry Operator with Grafana Tempo gives you distributed tracing. The zero-code injection path (annotate a Deployment, OTel Operator injects the agent) works for Python, Java, and Node.js without touching application code. With Prometheus, Loki, and Tempo all connected as Grafana data sources, you can jump from a trace to that span's logs to the service's error rate metrics at that exact timestamp.

**Network flows** — Hubble is included with Cilium. `hubble observe --verdict DROPPED --follow` shows you policy denials in real time. The Hubble UI is a live network map of your cluster.

**Cost** — OpenCost gives you real-time cost visibility by namespace, deployment, and label. On a homelab or on-prem cluster you configure custom pricing; on cloud you pull actual instance costs.

The [Observability section](https://docs.shani.dev/doc/servers/kubernetes#observability) covers all of this — including Grafana Alloy config, LogQL examples, OTel Collector YAML, auto-instrumentation, Tempo setup, and DORA metrics via Prometheus recording rules.

---

## Autoscaling: Beyond `kubectl scale`

Four tools, four different problems:

**HPA** (Horizontal Pod Autoscaler) scales replica counts based on CPU, memory, or custom metrics. One critical requirement: `resources.requests.cpu` must be set, or HPA shows `<unknown>` and does nothing — it calculates utilization as `current / requested`.

**KEDA** (Event-Driven Autoscaling) scales to zero and back based on external event sources — RabbitMQ queue depth, Kafka consumer lag, Prometheus query results, HTTP traffic, and 60+ other scalers. If your workers should scale to zero when there's no work, KEDA is the answer.

**Karpenter** provisions the right cloud VM instance type for pending pods rather than scaling a fixed node group. Only relevant when running on cloud.

**Goldilocks** uses VPA in recommendation mode to tell you what resource requests your containers actually need based on real traffic. Run it for a few hours against production, then set requests accordingly. Never run VPA's auto mode and HPA on the same metric — they fight each other.

The [Autoscaling section](https://docs.shani.dev/doc/servers/kubernetes#autoscaling) has YAML for all of these.

---

## Cluster Management UIs

Four options, depending on what you need:

**k9s** is a terminal-based cluster manager and the one you'll use most. Navigate resources with arrow keys, view logs with `l`, shell into a pod with `s`, switch namespaces with `:ns`, switch contexts with `:ctx`. Install via Nix.

**Headlamp** is a modern web UI that runs as a Podman container alongside your cluster. Cleaner and more actively maintained than the official Kubernetes Dashboard.

**Kubernetes Dashboard** is the official option — install via Helm, create a ServiceAccount with `cluster-admin`, generate a token, port-forward, done. Good for giving read-only access to stakeholders.

**Rancher** manages multiple clusters from one UI. If you're running more than one cluster, it's worth the overhead. Run it on a separate host — not on a node it manages.

**Lens / OpenLens** is a desktop IDE for Kubernetes — available as a Flatpak on Shani OS. Auto-detects all contexts from `~/.kube/config`.

---

## Backup and Disaster Recovery

Don't skip this section. Two tools, both essential:

**Velero** backs up namespace resources and PVC data to S3 (MinIO works perfectly as the backend). A scheduled backup runs daily at 2 AM and keeps 30 days of history. Restore to a different namespace for migration testing.

**etcd snapshots** (k3s has this built in) capture the full cluster state independent of Velero:

```bash
sudo k3s etcd-snapshot save --name homelab-$(date +%Y%m%d)
```

Run both. Velero for individual namespace restores and migrations, etcd snapshots for full cluster disaster recovery. The [Backup & Disaster Recovery section](https://docs.shani.dev/doc/servers/kubernetes#backup--disaster-recovery) has the Velero install, scheduled backup Schedule CRDs, and restore commands.

---

## The Hardening Checklist

Before calling a cluster production-ready, run through this. The [Cluster Hardening section](https://docs.shani.dev/doc/servers/kubernetes#cluster-hardening) has the `kube-bench` commands and the full checklist with tooling references:

- Audit logging enabled and shipping to Loki
- `restricted` PSA enforced on all workload namespaces
- `runAsNonRoot: true` and `readOnlyRootFilesystem: true` on all containers
- Resource limits required via Kyverno
- No `:latest` image tags in production
- All images signed (Cosign) and verified at admission (Kyverno `verifyImages`)
- Trivy Operator scanning continuously
- Default-deny NetworkPolicy in every namespace
- Secrets in Sealed Secrets or ESO — never plaintext YAML
- Falco running for runtime detection
- Velero scheduled backups running
- etcd snapshots to off-cluster storage

---

## Further Reading

The [full Kubernetes reference wiki](https://docs.shani.dev/doc/servers/kubernetes) covers everything in complete depth:

- [Key Concepts](https://docs.shani.dev/doc/servers/kubernetes#key-concepts) — control plane, etcd, pod lifecycle, RBAC, probes, GitOps mental model, DORA metrics
- [Distributions](https://docs.shani.dev/doc/servers/kubernetes#distributions) — k3s, k0s, MicroK8s, minikube, kind, RKE2, Talos, kubeadm, Cluster API
- [Networking & Ingress](https://docs.shani.dev/doc/servers/kubernetes#networking--ingress) — Cilium, MetalLB, Gateway API, NGF, L7 policies
- [DNS](https://docs.shani.dev/doc/servers/kubernetes#dns) — CoreDNS customization, ndots, ExternalDNS
- [Storage](https://docs.shani.dev/doc/servers/kubernetes#storage) — Longhorn, Rook-Ceph, NFS, MinIO, PVC resize
- [Security & Policy](https://docs.shani.dev/doc/servers/kubernetes#security--policy) — RBAC, PSA, Kyverno, OPA/Gatekeeper, Falco
- [Secrets Management](https://docs.shani.dev/doc/servers/kubernetes#secrets-management) — Sealed Secrets, ESO with OpenBao/Infisical
- [Workload Patterns](https://docs.shani.dev/doc/servers/kubernetes#workload-patterns) — Init containers, StatefulSets, Jobs, CronJobs, PDBs, affinity, lifecycle hooks
- [Autoscaling](https://docs.shani.dev/doc/servers/kubernetes#autoscaling) — HPA, KEDA, Karpenter, Goldilocks
- [GitOps & Continuous Delivery](https://docs.shani.dev/doc/servers/kubernetes#gitops--continuous-delivery) — ArgoCD, Flux, Kargo, Kustomize
- [Progressive Delivery](https://docs.shani.dev/doc/servers/kubernetes#progressive-delivery) — Argo Rollouts canary/blue-green
- [In-Cluster CI/CD & Build](https://docs.shani.dev/doc/servers/kubernetes#in-cluster-cicd--build) — Tekton, Kaniko, Argo Workflows
- [Image Supply Chain Security](https://docs.shani.dev/doc/servers/kubernetes#image-supply-chain-security) — Harbor, Cosign, Trivy, Zot
- [Observability](https://docs.shani.dev/doc/servers/kubernetes#observability) — Prometheus, Loki, Alloy, OTel, Tempo, OpenCost, DORA
- [Alerting & On-Call](https://docs.shani.dev/doc/servers/kubernetes#alerting--on-call) — AlertManager, PrometheusRule, ServiceMonitor, Grafana OnCall
- [Service Mesh](https://docs.shani.dev/doc/servers/kubernetes#service-mesh) — Linkerd mTLS, ServiceProfile, traffic splitting
- [Backup & Disaster Recovery](https://docs.shani.dev/doc/servers/kubernetes#backup--disaster-recovery) — Velero, etcd snapshots
- [Platform Engineering](https://docs.shani.dev/doc/servers/kubernetes#platform-engineering) — Crossplane, LitmusChaos, Keptn, Golden Paths, Port
- [Operator Pattern](https://docs.shani.dev/doc/servers/kubernetes#operator-pattern--custom-resources) — CloudNativePG, Strimzi Kafka, Redis Operator
- [Multi-Tenancy & Audit](https://docs.shani.dev/doc/servers/kubernetes#multi-tenancy--audit) — vCluster, audit logging, LogQL queries
- [Helm — Advanced Usage](https://docs.shani.dev/doc/servers/kubernetes#helm--advanced-usage) — Helmfile, OCI charts, schema validation
- [Multi-Cluster](https://docs.shani.dev/doc/servers/kubernetes#multi-cluster) — Admiralty, Submariner
- [kubectl Power Usage](https://docs.shani.dev/doc/servers/kubernetes#kubectl-power-usage) — JSONPath, patch patterns, one-liners
- [Daily Operations](https://docs.shani.dev/doc/servers/kubernetes#daily-operations) — the commands you'll use every day
- [Caddy Configuration Reference](https://docs.shani.dev/doc/servers/kubernetes#caddy-configuration-reference) — every service exposed via Caddy
- [Troubleshooting](https://docs.shani.dev/doc/servers/kubernetes#troubleshooting) — every common failure mode across distributions, CNI, ingress, storage, GitOps, secrets, autoscaling, certificates, and observability

Other Shani OS guides:
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — single-host containers and compose stacks
- [Clusters & High Availability on Shani OS](https://blog.shani.dev/post/clusters-on-shani-os) — HA data stores
- [DevOps & Infrastructure on Shani OS](https://blog.shani.dev/post/devops-on-shani-os) — CI/CD, IaC, and platform tools
- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide)
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
