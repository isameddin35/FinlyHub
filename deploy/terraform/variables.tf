variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "ssh_key_name" {
  description = "Name of existing EC2 key pair for SSH access"
  type        = string
}

variable "ssh_cidr" {
  description = "CIDR block allowed for SSH access (e.g. your public IP)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "c7i-flex.large"
}

variable "repo_url" {
  description = "Git repository URL"
  type        = string
  default     = "https://github.com/isameddin35/FinlyHub.git"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "finlyhub"
}

variable "jwt_secret" {
  description = "JWT signing secret (auto-generated if empty)"
  type        = string
  default     = ""
}

variable "db_password" {
  description = "PostgreSQL password (auto-generated if empty)"
  type        = string
  default     = ""
}
