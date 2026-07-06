locals {
  user_data = file("${path.module}/../deploy.sh")
}

# --- Security Group ---
resource "aws_security_group" "finlyhub" {
  name        = "${var.project_name}-sg"
  description = "FinlyHub security group"
  tags        = { Name = "${var.project_name}-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.finlyhub.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP from anywhere"
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.finlyhub.id
  cidr_ipv4         = var.ssh_cidr
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  description       = "SSH from allowed IP"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.finlyhub.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "All outbound traffic"
}

# --- IAM Role for EC2 SSM access ---
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "finlyhub" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
  tags               = { Name = "${var.project_name}-ec2-role" }
}

resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.finlyhub.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ssm_readonly" {
  role       = aws_iam_role.finlyhub.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

resource "aws_iam_instance_profile" "finlyhub" {
  name = "${var.project_name}-instance-profile"
  role = aws_iam_role.finlyhub.name
}

# --- EC2 Instance ---
data "aws_ssm_parameter" "amzn2_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64"
}

resource "aws_instance" "finlyhub" {
  ami                    = data.aws_ssm_parameter.amzn2_ami.value
  instance_type          = var.instance_type
  key_name               = var.ssh_key_name
  iam_instance_profile   = aws_iam_instance_profile.finlyhub.name
  vpc_security_group_ids = [aws_security_group.finlyhub.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    tags        = { Name = "${var.project_name}-root" }
  }

  user_data_base64 = base64encode(local.user_data)

  tags = {
    Name = var.project_name
  }
}
