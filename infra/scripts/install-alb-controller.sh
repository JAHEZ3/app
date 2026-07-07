#!/usr/bin/env bash
# One-time: install the AWS Load Balancer Controller into the EKS cluster.
# It watches Ingress objects and creates/updates ALBs. Required before the
# jahez Ingress will get a load balancer.
#
# Run after `terraform apply` in infra/terraform. Needs helm + kubectl + aws.
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
CLUSTER="$(terraform -chdir="$(dirname "$0")/../terraform" output -raw cluster_name)"
ROLE_ARN="$(terraform -chdir="$(dirname "$0")/../terraform" output -raw alb_controller_role_arn)"
VPC_ID="$(aws eks describe-cluster --name "$CLUSTER" --region "$REGION" \
  --query 'cluster.resourcesVpcConfig.vpcId' --output text)"

echo "Cluster: $CLUSTER | Region: $REGION | VPC: $VPC_ID"

aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"

# Service account annotated with the IRSA role Terraform created.
kubectl create serviceaccount aws-load-balancer-controller -n kube-system \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl annotate serviceaccount aws-load-balancer-controller -n kube-system \
  "eks.amazonaws.com/role-arn=$ROLE_ARN" --overwrite

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="$CLUSTER" \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region="$REGION" \
  --set vpcId="$VPC_ID"

echo "Done. Verify: kubectl -n kube-system get deploy aws-load-balancer-controller"
