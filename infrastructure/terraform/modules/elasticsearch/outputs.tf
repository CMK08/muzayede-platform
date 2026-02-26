###############################################################################
# OpenSearch Module — Outputs
###############################################################################

output "domain_id" {
  description = "OpenSearch domain ID"
  value       = aws_opensearch_domain.this.domain_id
}

output "domain_name" {
  description = "OpenSearch domain name"
  value       = aws_opensearch_domain.this.domain_name
}

output "endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.this.endpoint
}

output "kibana_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = aws_opensearch_domain.this.dashboard_endpoint
}

output "arn" {
  description = "OpenSearch domain ARN"
  value       = aws_opensearch_domain.this.arn
}

output "security_group_id" {
  description = "Security group ID for the OpenSearch domain"
  value       = aws_security_group.opensearch.id
}
