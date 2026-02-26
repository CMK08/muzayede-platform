###############################################################################
# EKS Module — AWS Elastic Kubernetes Service
###############################################################################

# -----------------------------------------------------------------------------
# VPC for EKS
# -----------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/${var.cluster_name}"  = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"            = 1
    "kubernetes.io/cluster/${var.cluster_name}"   = "owned"
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# EKS Cluster
# -----------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Cluster add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent              = true
      service_account_role_arn = module.vpc_cni_irsa.iam_role_arn
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Managed Node Groups
  eks_managed_node_groups = {
    general = {
      name            = "${var.cluster_name}-general"
      instance_types  = [var.node_instance_type]
      min_size        = var.node_min_size
      max_size        = var.node_max_size
      desired_size    = var.node_desired_size

      disk_size = var.node_disk_size

      labels = {
        role        = "general"
        environment = var.environment
      }

      tags = merge(var.tags, {
        "k8s.io/cluster-autoscaler/enabled"             = "true"
        "k8s.io/cluster-autoscaler/${var.cluster_name}"  = "owned"
      })
    }
  }

  # Fargate profiles (optional, for system workloads)
  fargate_profiles = var.enable_fargate ? {
    system = {
      name = "system"
      selectors = [
        {
          namespace = "kube-system"
        }
      ]
    }
  } : {}

  # Access management
  enable_cluster_creator_admin_permissions = true

  tags = var.tags
}

# -----------------------------------------------------------------------------
# IRSA — VPC CNI
# -----------------------------------------------------------------------------
module "vpc_cni_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name             = "${var.cluster_name}-vpc-cni"
  attach_vpc_cni_policy = true
  vpc_cni_enable_ipv4   = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-node"]
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# IRSA — EBS CSI Driver
# -----------------------------------------------------------------------------
module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name             = "${var.cluster_name}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Cluster Autoscaler IRSA
# -----------------------------------------------------------------------------
module "cluster_autoscaler_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name                        = "${var.cluster_name}-cluster-autoscaler"
  attach_cluster_autoscaler_policy = true
  cluster_autoscaler_cluster_names = [module.eks.cluster_name]

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:cluster-autoscaler"]
    }
  }

  tags = var.tags
}
