import type { CloudBlock } from '../../../core/types/common';
import type { Connection } from '../../../types/blocks';

/**
 * AWS Terraform 코드 생성기
 * 기존 codeGenerator.ts의 AWS 부분을 분리
 */
export class AWSTerraformGenerator {
    /**
     * AWS Terraform 코드 생성
     */
    static generateCode(blocks: CloudBlock[], connections: Connection[] = []): string {
        console.log("🔧 [AWSTerraformGenerator] Starting AWS Terraform code generation");
        console.log("🔧 [AWSTerraformGenerator] Blocks:", blocks.length);
        console.log("🔧 [AWSTerraformGenerator] Connections:", connections.length);

        if (!blocks.length) {
            return this.generateEmptyTemplate();
        }

        let code = this.generateHeader(blocks, connections);

        // VPC 먼저 생성
        const vpcs = blocks.filter((block) => block.type === "vpc");
        vpcs.forEach((vpc) => {
            code += this.generateVPCCode(vpc);
        });

        // Subnet 생성
        const subnets = blocks.filter((block) => block.type === "subnet");
        subnets.forEach((subnet) => {
            code += this.generateSubnetCode(subnet, vpcs);
        });

        // Security Groups 생성
        const securityGroups = blocks.filter((block) => block.type === "security-group");
        securityGroups.forEach((sg) => {
            code += this.generateSecurityGroupCode(sg, vpcs);
        });

        // EBS Volumes 생성
        const volumes = blocks.filter((block) => block.type === "volume" || block.type === "ebs");
        volumes.forEach((volume) => {
            code += this.generateVolumeCode(volume);
        });

        // EC2 인스턴스 생성
        const ec2s = blocks.filter((block) => block.type === "ec2");
        ec2s.forEach((ec2) => {
            code += this.generateEC2Code(ec2, subnets, securityGroups, volumes);
        });

        // Load Balancers 생성
        const loadBalancers = blocks.filter((block) => block.type === "load-balancer");
        loadBalancers.forEach((lb) => {
            code += this.generateLoadBalancerCode(lb, subnets, securityGroups);
        });

        return code;
    }

    private static generateEmptyTemplate(): string {
        return `# 아직 블록이 없습니다. 
# 팔레트에서 블록을 드래그하여 캔버스에 배치하세요.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
  
  default_tags {
    tags = {
      Project     = "BlockCloud"
      CreatedBy   = "terraform"
      Environment = "development"
      ManagedBy   = "lego-builder"
    }
  }
}
`;
    }

    private static generateHeader(blocks: CloudBlock[], connections: Connection[]): string {
        return `# AWS 인프라 - Terraform 코드
# 마지막 업데이트: ${new Date().toLocaleString()}
# 총 블록 수: ${blocks.length}개
# 총 연결 수: ${connections.length}개

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
  
  default_tags {
    tags = {
      Project     = "BlockCloud"
      CreatedBy   = "terraform"
      Environment = "development"
      ManagedBy   = "lego-builder"
    }
  }
}

`;
    }

    private static generateVPCCode(vpc: CloudBlock): string {
        const cidrBlock = vpc.properties.cidrBlock || "10.0.0.0/16";
        const enableDnsSupport = vpc.properties.enableDnsSupport ?? true;
        const enableDnsHostnames = vpc.properties.enableDnsHostnames ?? true;

        return `# VPC: ${vpc.properties.name || vpc.name}
resource "aws_vpc" "${this.sanitizeResourceName(vpc.id)}" {
  cidr_block           = "${cidrBlock}"
  enable_dns_support   = ${enableDnsSupport}
  enable_dns_hostnames = ${enableDnsHostnames}

  tags = {
    Name = "${vpc.properties.name || vpc.name}"
    Type = "VPC"
  }
}

`;
    }

    private static generateSubnetCode(subnet: CloudBlock, vpcs: CloudBlock[]): string {
        const cidrBlock = subnet.properties.cidrBlock || "10.0.1.0/24";
        const availabilityZone = subnet.properties.availabilityZone || "ap-northeast-2a";

        // VPC 참조 찾기 (첫 번째 VPC 사용)
        const vpcRef = vpcs.length > 0 ?
            `aws_vpc.${this.sanitizeResourceName(vpcs[0].id)}.id` :
            '"vpc-xxxxxx"';

        return `# Subnet: ${subnet.properties.name || subnet.name}
resource "aws_subnet" "${this.sanitizeResourceName(subnet.id)}" {
  vpc_id            = ${vpcRef}
  cidr_block        = "${cidrBlock}"
  availability_zone = "${availabilityZone}"

  tags = {
    Name = "${subnet.properties.name || subnet.name}"
    Type = "Subnet"
  }
}

`;
    }

    private static generateSecurityGroupCode(sg: CloudBlock, vpcs: CloudBlock[]): string {
        const vpcRef = vpcs.length > 0 ?
            `aws_vpc.${this.sanitizeResourceName(vpcs[0].id)}.id` :
            '"vpc-xxxxxx"';

        let code = `# Security Group: ${sg.properties.name || sg.name}
resource "aws_security_group" "${this.sanitizeResourceName(sg.id)}" {
  name_prefix = "${sg.properties.name || sg.name}-"
  vpc_id      = ${vpcRef}
  description = "${sg.properties.description || sg.description}"

`;

        // 보안 규칙 추가
        const rules = sg.properties.securityRules || [];
        rules.forEach((rule: any) => { // index 사용하지 않음
            if (rule.type === 'ingress') {
                code += `  ingress {
    from_port   = ${rule.fromPort}
    to_port     = ${rule.toPort}
    protocol    = "${rule.protocol}"
    cidr_blocks = ${JSON.stringify(rule.cidrBlocks)}
  }

`;
            }
        });

        code += `  tags = {
    Name = "${sg.properties.name || sg.name}"
    Type = "SecurityGroup"
  }
}

`;

        return code;
    }

    private static generateVolumeCode(volume: CloudBlock): string {
        const volumeSize = volume.properties.volumeSize || 20;
        const volumeType = volume.properties.volumeType || "gp3";

        return `# EBS Volume: ${volume.properties.name || volume.name}
resource "aws_ebs_volume" "${this.sanitizeResourceName(volume.id)}" {
  availability_zone = "ap-northeast-2a"
  size              = ${volumeSize}
  type              = "${volumeType}"

  tags = {
    Name = "${volume.properties.name || volume.name}"
    Type = "EBSVolume"
  }
}

`;
    }

    private static generateEC2Code(
        ec2: CloudBlock,
        subnets: CloudBlock[],
        securityGroups: CloudBlock[],
        volumes: CloudBlock[]
        // connections는 사용하지 않음
    ): string {
        const instanceType = ec2.properties.instanceType || "t3.micro";
        const ami = ec2.properties.ami || "ami-0c6e5afdd23291f73";

        const subnetRef = subnets.length > 0 ?
            `aws_subnet.${this.sanitizeResourceName(subnets[0].id)}.id` :
            '"subnet-xxxxxx"';

        let code = `# EC2 Instance: ${ec2.properties.name || ec2.name}
resource "aws_instance" "${this.sanitizeResourceName(ec2.id)}" {
  ami           = "${ami}"
  instance_type = "${instanceType}"
  subnet_id     = ${subnetRef}

`;

        // Security Groups 연결
        if (securityGroups.length > 0) {
            const sgRefs = securityGroups.map(sg =>
                `aws_security_group.${this.sanitizeResourceName(sg.id)}.id`
            ).join(', ');
            code += `  vpc_security_group_ids = [${sgRefs}]

`;
        }

        code += `  tags = {
    Name = "${ec2.properties.name || ec2.name}"
    Type = "EC2Instance"
  }
}

`;

        // EBS Volume 연결
        volumes.forEach((volume) => { // index 사용하지 않음
            code += `# EBS Volume Attachment: ${volume.name} → ${ec2.name}
resource "aws_volume_attachment" "${this.sanitizeResourceName(ec2.id)}_${this.sanitizeResourceName(volume.id)}" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.${this.sanitizeResourceName(volume.id)}.id
  instance_id = aws_instance.${this.sanitizeResourceName(ec2.id)}.id
}

`;
        });

        return code;
    }

    private static generateLoadBalancerCode(
        lb: CloudBlock,
        subnets: CloudBlock[],
        securityGroups: CloudBlock[]
    ): string {
        const lbType = lb.properties.loadBalancerType || "application";

        const subnetRefs = subnets.length > 0 ?
            subnets.map(subnet =>
                `aws_subnet.${this.sanitizeResourceName(subnet.id)}.id`
            ).join(', ') :
            '"subnet-xxxxxx"';

        let code = `# Load Balancer: ${lb.properties.name || lb.name}
resource "aws_lb" "${this.sanitizeResourceName(lb.id)}" {
  name               = "${this.sanitizeResourceName(lb.properties.name || lb.name)}"
  load_balancer_type = "${lbType}"
  subnets            = [${subnetRefs}]

`;

        if (securityGroups.length > 0) {
            const sgRefs = securityGroups.map(sg =>
                `aws_security_group.${this.sanitizeResourceName(sg.id)}.id`
            ).join(', ');
            code += `  security_groups = [${sgRefs}]

`;
        }

        code += `  tags = {
    Name = "${lb.properties.name || lb.name}"
    Type = "LoadBalancer"
  }
}

`;

        return code;
    }

    /**
     * Terraform 리소스 이름 정리 (특수문자 제거)
     */
    private static sanitizeResourceName(name: string): string {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }
}

