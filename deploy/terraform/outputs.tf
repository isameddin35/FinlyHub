output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.finlyhub.public_ip
}

output "public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.finlyhub.public_dns
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.finlyhub.id
}

output "ssh_command" {
  description = "SSH command to access the instance"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ec2-user@${aws_instance.finlyhub.public_dns}"
}


