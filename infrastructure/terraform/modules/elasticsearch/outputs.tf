###############################################################################
# OpenSearch Module - Outputs
###############################################################################

output "domain_id" {
  description = "ID of the OpenSearch domain"
  value       = aws_opensearch_domain.main.domain_id
}

output "domain_arn" {
  description = "ARN of the OpenSearch domain"
  value       = aws_opensearch_domain.main.arn
}

output "domain_name" {
  description = "Name of the OpenSearch domain"
  value       = aws_opensearch_domain.main.domain_name
}

output "domain_endpoint" {
  description = "Domain-specific endpoint for the OpenSearch domain"
  value       = aws_opensearch_domain.main.endpoint
}

output "dashboard_endpoint" {
  description = "Domain-specific endpoint for the OpenSearch Dashboards"
  value       = aws_opensearch_domain.main.dashboard_endpoint
}

output "security_group_id" {
  description = "Security group ID of the OpenSearch domain"
  value       = aws_security_group.opensearch.id
}

output "connection_url" {
  description = "OpenSearch HTTPS connection URL"
  value       = "https://${aws_opensearch_domain.main.endpoint}:443"
}
