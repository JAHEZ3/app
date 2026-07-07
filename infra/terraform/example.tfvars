# Copy to terraform.tfvars and adjust. terraform.tfvars is gitignored.
aws_region  = "eu-north-1"
project     = "jahez"
environment = "dev"

# Dev sizing (cheap). For prod, scale these up.
single_nat_gateway = true
node_instance_types = ["t3.medium"]
node_desired_size   = 2
db_instance_class   = "db.t3.micro"
redis_node_type     = "cache.t3.micro"
