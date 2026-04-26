---
slug: kubernetes-on-shani-os
title: 'Kubernetes on Shani OS — k3s, k0s, MicroK8s, and the Full Orchestration Stack'
date: '2026-05-05'
tag: 'Guide'
excerpt: 'How to run Kubernetes on Shani OS — from a single-node k3s cluster in two minutes, to multi-node production setups with ArgoCD, cert-manager, Longhorn, and full GitOps. Covers k3s, k0s, MicroK8s, minikube, kind, RKE2, and Talos Linux.'
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

Podman handles single-host containerised workloads on Shani OS beautifully. But when you outgrow a single host — when you need multi-node scheduling, rolling deployments, automatic failover, or you are preparing for a production environment — Kubernetes is the next step.

Shani OS's immutable architecture and Btrfs subvolume model are a natural fit. Kubernetes data lives in dedicated subvolumes (`@containers` for runtime state, `@home` for kubeconfigs and manifests), completely independent of the OS. A Shani OS update never touches your cluster. A cluster upgrade never touches the OS. The two lifecycles are fully decoupled.

This guide covers every Kubernetes distribution that runs on Shani OS — from a two-minute single-node k3s install to hardened multi-node RKE2 clusters — plus the ecosystem tools (Helm, ArgoCD, cert-manager, Longhorn, Rancher) that make it production-capable.

Full reference: [docs.shani.dev — Kubernetes](https://docs.shani.dev/doc/servers/kubernetes).

---

## Choosing a Distribution

| Distribution | Best for | Complexity |
|---|---|---|
| **k3s** | Single-node, homelab, edge, IoT, most use cases | Low |
| **k0s** | Minimal footprint, embedded systems | Low |
| **MicroK8s** | Snap-based, addon-driven, easy GPU/Istio | Low |
| **minikube** | Local dev, Podman driver | Low |
| **kind** | CI testing, Kubernetes-in-Podman | Low |
| **RKE2** | Hardened production, CIS compliance | Medium |
| **kubeadm** | Upstream reference, full control | High |
| **Talos Linux** | Immutable Kubernetes OS (VM or bare metal) | High |

For most people: start with k3s. It is a fully conformant CNCF Kubernetes, installs in under two minutes, and handles everything from a homelab media stack to a small production workload.

---

## k3s — Lightweight CNCF Kubernetes

k3s is a single binary that packages the full Kubernetes API server, controller manager, scheduler, kubelet, and a built-in SQLite backend (upgradeable to etcd for HA). It is the fastest path from zero to a working cluster.

### Single-Node Install

```bash
# Install k3s (single binary, includes kubectl)
curl -sfL https://get.k3s.io | sh -

# Check the node is ready
sudo kubectl get nodes

# Copy kubeconfig to your user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# Verify
kubectl get nodes
kubectl get pods -A
```

k3s registers itself as a systemd service and starts automatically at boot. Its state lives under `/var/lib/rancher/k3s` which is inside `@containers` on Shani OS.

### Adding Worker Nodes

```bash
# On the control plane — get the node token
sudo cat /var/lib/rancher/k3s/server/node-token

# On each worker node
curl -sfL https://get.k3s.io | K3S_URL=https://<control-plane-ip>:6443 \
  K3S_TOKEN=<node-token> sh -

# Back on the control plane — verify workers joined
kubectl get nodes
```

### Common k3s Operations

```bash
# Deploy a workload
kubectl apply -f deployment.yaml

# Scale a deployment
kubectl scale deployment myapp --replicas=3

# Check logs
kubectl logs -f deployment/myapp

# Port-forward for local access
kubectl port-forward svc/myapp 8080:80

# Uninstall k3s (control plane)
/usr/local/bin/k3s-uninstall.sh

# Uninstall k3s (agent/worker)
/usr/local/bin/k3s-agent-uninstall.sh
```

---

## k0s — Minimal Single Binary

k0s has an even smaller footprint than k3s — no bundled components beyond the bare Kubernetes runtime. Good for embedded hardware or when you want to add only what you explicitly need.

```bash
# Download and install
curl -sSLf https://get.k0s.sh | sudo sh

# Create a default config
sudo k0s config create > /etc/k0s/k0s.yaml

# Install as a controller (single node)
sudo k0s install controller --single -c /etc/k0s/k0s.yaml

# Start
sudo k0s start

# Access
sudo k0s kubectl get nodes
```

---

## MicroK8s — Snap-Based, Addon-Driven

MicroK8s installs via Snap and ships as a batteries-included Kubernetes with an addon system that enables capabilities with one command.

```bash
# Install via Snap (already configured on Shani OS)
sudo snap install microk8s --classic

# Add yourself to the microk8s group
sudo usermod -aG microk8s $USER
newgrp microk8s

# Enable addons
microk8s enable dns storage ingress

# GPU support (AMD and NVIDIA)
microk8s enable gpu

# Service mesh
microk8s enable istio

# Check status
microk8s status

# Use kubectl
microk8s kubectl get nodes

# Export a standard kubeconfig
microk8s config > ~/.kube/config
```

---

## minikube — Local Dev with Podman Driver

minikube runs a local Kubernetes cluster inside a Podman container — no VM required on Shani OS.

```bash
# Install minikube
nix-env -iA nixpkgs.minikube

# Start with the Podman driver
minikube start --driver=podman --container-runtime=containerd

# Access
kubectl get nodes

# Open the Kubernetes dashboard
minikube dashboard

# Stop/delete
minikube stop
minikube delete
```

---

## kind — Kubernetes in Podman for CI

kind (Kubernetes in Docker) runs each Kubernetes node as a Podman container. It is the standard tool for running ephemeral clusters in CI pipelines.

```bash
# Install kind
nix-env -iA nixpkgs.kind

# Create a cluster
kind create cluster --name dev

# Multi-node cluster
cat > kind-config.yaml << 'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
EOF
kind create cluster --config kind-config.yaml

# Delete
kind delete cluster --name dev
```

---

## RKE2 — Hardened Production Kubernetes

RKE2 is Rancher's hardened Kubernetes distribution. It passes CIS Kubernetes Benchmark and DISA STIG compliance checks out of the box — appropriate for production workloads where security posture matters.

```bash
# Install RKE2 server (control plane)
curl -sfL https://get.rke2.io | sh -

# Configure
mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml << 'EOF'
tls-san:
  - <your-server-ip>
  - rke2.home.local
EOF

# Enable and start
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# kubeconfig
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
sudo /var/lib/rancher/rke2/bin/kubectl get nodes
```

---

## kubeadm — Upstream Reference Install

kubeadm is the official Kubernetes installation tool from the Kubernetes project itself. Every distribution (k3s, k0s, RKE2) builds on what kubeadm establishes. If you need vanilla upstream Kubernetes with no vendor customisations — or you want to understand what the distributions are doing under the hood — kubeadm is the right path.

```bash
# Install kubeadm, kubelet, and kubectl via Nix
nix-env -iA nixpkgs.kubeadm nixpkgs.kubelet nixpkgs.kubectl

# Enable required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter
echo "overlay" | sudo tee /etc/modules-load.d/k8s.conf
echo "br_netfilter" | sudo tee -a /etc/modules-load.d/k8s.conf

# Required sysctl params
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# Initialise the control plane
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=<node-ip>

# Set up kubeconfig
mkdir -p ~/.kube
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# Install a CNI plugin (Flannel)
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Get the join command for worker nodes
kubeadm token create --print-join-command
```

```bash
# On each worker — run the join command from above
sudo kubeadm join <control-plane-ip>:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

```bash
# Common operations
kubectl get componentstatuses
kubeadm certs check-expiration      # check certificate expiry
sudo kubeadm certs renew all        # renew before expiry

# Upgrade the cluster
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply v1.30.0

# Reset a node (destructive)
sudo kubeadm reset
```

---

## Helm — Kubernetes Package Manager

Helm is the standard package manager for Kubernetes. Charts package up Kubernetes manifests, default values, and dependencies — the same way a package manager handles software.

```bash
# Install Helm
nix-env -iA nixpkgs.kubernetes-helm

# Add common chart repositories
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Search for a chart
helm search repo postgresql

# Install a chart
helm install my-postgres bitnami/postgresql \
  --set auth.postgresPassword=secret \
  --namespace databases --create-namespace

# Upgrade
helm upgrade my-postgres bitnami/postgresql --set image.tag=16

# Rollback
helm rollback my-postgres 1

# List releases
helm list -A

# Uninstall
helm uninstall my-postgres -n databases
```

---

## ArgoCD — GitOps Continuous Delivery

ArgoCD watches a Git repository and continuously reconciles your cluster state to match the manifests in that repository. Every change is a Git commit, every deployment is auditable, and drift from the desired state is automatically corrected.

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods
kubectl wait --for=condition=available deployment -l app.kubernetes.io/name=argocd-server \
  -n argocd --timeout=120s

# Get the initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d

# Port-forward the UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access at https://localhost:8080

# Install the argocd CLI
nix-env -iA nixpkgs.argocd

# Login
argocd login localhost:8080 --username admin --insecure

# Create an application pointing to a Git repo
argocd app create myapp \
  --repo https://github.com/youruser/k8s-manifests.git \
  --path apps/myapp \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated

# Check sync status
argocd app get myapp
argocd app sync myapp
```

---

## cert-manager — Automatic TLS

cert-manager provisions and renews TLS certificates in-cluster. It integrates with Let's Encrypt, your own CA (via Step-CA), and Cloudflare DNS challenge for wildcard certificates.

```bash
# Install cert-manager via Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# Create a ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: you@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# Annotate an Ingress to use it
# cert-manager automatically provisions and renews the certificate
```

---

## Longhorn — Distributed Block Storage

Longhorn provides persistent block storage across nodes in a multi-node cluster — each PersistentVolumeClaim gets a replicated volume backed by local disks on your nodes.

```bash
# Install via Helm
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system --create-namespace

# Access the Longhorn UI
kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80
# Open http://localhost:8080

# Use Longhorn as the default StorageClass
kubectl patch storageclass longhorn \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

---

## ArgoCD + Flux CD — GitOps Comparison

**ArgoCD** — web UI, app-centric model, multi-cluster from the start, RBAC built in. Easier to get started with and better for teams who want a visual deployment dashboard.

**Flux CD** — CLI-first, source-controller model, tighter Helm and Kustomize integration. Better for operators who want everything in Git with no separate UI.

```bash
# Install Flux
nix-env -iA nixpkgs.fluxcd

# Bootstrap (connects Flux to your Git repo and writes its own manifests)
flux bootstrap github \
  --owner=youruser \
  --repository=k8s-fleet \
  --branch=main \
  --path=clusters/home \
  --personal

# Check status
flux get all
flux logs
```

---

## Cluster Management Tools

```bash
# k9s — terminal cluster manager with real-time resource navigation
nix-env -iA nixpkgs.k9s
k9s  # opens immediately, navigate with arrow keys and keyboard shortcuts

# Rancher — multi-cluster web UI
# Deploy via Helm for managing multiple clusters from one dashboard

# Lens / OpenLens — desktop IDE for Kubernetes
# Available as an AppImage or via the Open Lens Flatpak

# Velero — cluster backup and restore
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero \
  --namespace velero --create-namespace \
  --set configuration.provider=aws \
  --set configuration.backupStorageLocation.bucket=mycluster-backups
```

---

## Monitoring on Kubernetes

The kube-prometheus-stack Helm chart deploys Prometheus, Alertmanager, Grafana, and all the necessary exporters and dashboards in one command:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-grafana 3000:80
# Default credentials: admin / prom-operator
```

---

## Resources

- [Shani OS as a Home Server](https://blog.shani.dev/post/shani-os-home-server) — the full self-hosting overview
- [docs.shani.dev — Kubernetes](https://docs.shani.dev/doc/servers/kubernetes) — full reference with additional distributions and tools
- [Podman on Shani OS](https://blog.shani.dev/post/podman-containers-on-shani-os) — single-host containers
- [Clusters & High Availability on Shani OS](https://blog.shani.dev/post/clusters-on-shani-os) — HA data stores
- [DevOps & Infrastructure on Shani OS](https://blog.shani.dev/post/devops-on-shani-os) — CI/CD, IaC, and platform tools
- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
