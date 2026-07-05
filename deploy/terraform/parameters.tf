resource "random_password" "jwt_secret" {
  count  = var.jwt_secret == "" ? 1 : 0
  length = 64
}

resource "random_password" "db_password" {
  count  = var.db_password == "" ? 1 : 0
  length = 24
  special = false
}

locals {
  jwt_secret  = var.jwt_secret != "" ? var.jwt_secret : one(random_password.jwt_secret[*].result)
  db_password = var.db_password != "" ? var.db_password : one(random_password.db_password[*].result)
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/finlyhub/JWT_SECRET"
  type  = "SecureString"
  value = local.jwt_secret

  tags = { Name = "/finlyhub/JWT_SECRET" }
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/finlyhub/DB_PASSWORD"
  type  = "SecureString"
  value = local.db_password

  tags = { Name = "/finlyhub/DB_PASSWORD" }
}
