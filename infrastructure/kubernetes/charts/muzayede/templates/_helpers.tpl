{{/*
###############################################################################
# Muzayede Platform - Template Helpers
###############################################################################
*/}}

{{/*
Chart name, truncated to 63 characters (Kubernetes label limit).
*/}}
{{- define "muzayede.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Fully qualified app name: <release>-<chart>.
Truncated to 63 characters to comply with Kubernetes naming constraints.
*/}}
{{- define "muzayede.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Chart label value: <chart>-<version>.
*/}}
{{- define "muzayede.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels applied to every resource.
Usage: {{- include "muzayede.labels" (dict "name" $name "context" $) }}
*/}}
{{- define "muzayede.labels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .context.Release.Name }}
app.kubernetes.io/version: {{ .context.Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .context.Release.Service }}
app.kubernetes.io/part-of: muzayede
helm.sh/chart: {{ include "muzayede.chart" .context }}
environment: {{ .context.Values.global.environment }}
{{- end -}}

{{/*
Selector labels (subset of common labels for matchLabels).
Usage: {{- include "muzayede.selectorLabels" (dict "name" $name "context" $) }}
*/}}
{{- define "muzayede.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .context.Release.Name }}
{{- end -}}

{{/*
Resolve the container image string for a service.
Prefers per-service tag, falls back to global.imageTag.
Prepends global.imageRegistry when set.
Usage: {{ include "muzayede.image" (dict "svc" $svc "global" $.Values.global) }}
*/}}
{{- define "muzayede.image" -}}
{{- $tag := .svc.image.tag | default .global.imageTag | default "latest" -}}
{{- if .global.imageRegistry -}}
{{- printf "%s/%s:%s" .global.imageRegistry .svc.image.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .svc.image.repository $tag -}}
{{- end -}}
{{- end -}}

{{/*
Render the namespace, respecting the global override.
*/}}
{{- define "muzayede.namespace" -}}
{{- .Values.global.namespace | default .Release.Namespace -}}
{{- end -}}
