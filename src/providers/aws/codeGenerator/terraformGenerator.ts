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
    const vpcs = blocks.filter((block) => block.type === "aws-vpc");
    vpcs.forEach((vpc) => {
      code += this.generateVPCCode(vpc);
    });

    // Subnet 생성
    const subnets = blocks.filter((block) => block.type === "aws-subnet");
    subnets.forEach((subnet) => {
      code += this.generateSubnetCode(subnet, vpcs);
    });

    // Security Groups 생성
    const securityGroups = blocks.filter((block) => block.type === "aws-security-group");
    securityGroups.forEach((sg) => {
      code += this.generateSecurityGroupCode(sg, vpcs);
    });

    // EBS Volumes 생성 (부트볼륨으로 사용되지 않는 것만)
    const volumes = blocks.filter((block) => block.type === "aws-volume");
    const ec2s = blocks.filter((block) => block.type === "aws-ec2");

    volumes.forEach((volume) => {
      // 이 Volume이 부트볼륨으로 사용되는지 확인
      const isBootVolume = connections.some(conn => {
        const isVolumeConnection = (
          (conn.fromBlockId === volume.id || conn.toBlockId === volume.id) &&
          ec2s.some(ec2 => ec2.id === conn.fromBlockId || ec2.id === conn.toBlockId)
        );
        return isVolumeConnection &&
          conn.properties?.stackConnection === true &&
          conn.properties?.volumeType === 'boot';
      });

      // 부트볼륨이 아닌 경우만 별도 리소스 생성
      if (!isBootVolume) {
        code += this.generateVolumeCode(volume);
      }
    });

    // EC2 인스턴스 생성
    ec2s.forEach((ec2) => {
      code += this.generateEC2Code(ec2, subnets, securityGroups, volumes, connections);
    });

    // Load Balancers 생성
    const loadBalancers = blocks.filter((block) => block.type === "aws-load-balancer");
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
    volumes: CloudBlock[],
    connections: Connection[]
  ): string {
    const instanceType = ec2.properties.instanceType || "t3.micro";
    const ami = ec2.properties.ami || "ami-0c6e5afdd23291f73";

    // EC2-Subnet 연결 찾기 (스태킹 관계)
    const subnetConnection = connections.find(conn =>
      (conn.fromBlockId === ec2.id || conn.toBlockId === ec2.id) &&
      conn.properties?.stackConnection === true &&
      subnets.some(s => s.id === conn.fromBlockId || s.id === conn.toBlockId)
    );

    let subnetRef = '"subnet-xxxxxx"';
    if (subnetConnection) {
      // 연결된 Subnet ID 찾기
      const connectedSubnetId = subnetConnection.fromBlockId === ec2.id
        ? subnetConnection.toBlockId
        : subnetConnection.fromBlockId;
      const connectedSubnet = subnets.find(s => s.id === connectedSubnetId);

      if (connectedSubnet) {
        subnetRef = `aws_subnet.${this.sanitizeResourceName(connectedSubnet.id)}.id`;
        console.log(`[EC2CodeGen] EC2 ${ec2.id.substring(0, 8)} → Subnet ${connectedSubnet.id.substring(0, 8)}`);
      }
    } else if (subnets.length > 0) {
      // 연결이 없으면 첫 번째 Subnet 사용 (fallback)
      subnetRef = `aws_subnet.${this.sanitizeResourceName(subnets[0].id)}.id`;
      console.warn(`[EC2CodeGen] No subnet connection found for EC2 ${ec2.id.substring(0, 8)}, using first subnet`);
    }

    // 부트볼륨 찾기 (스태킹된 Volume)
    console.log(`[EC2CodeGen] EC2 ${ec2.id.substring(0, 8)} - 부트볼륨 검색 중...`);
    console.log(`[EC2CodeGen] 전체 연결 수: ${connections.length}, Volume 수: ${volumes.length}`);

    const bootVolume = volumes.find((volume) => {
      const volumeConnection = connections.find(conn =>
        (conn.fromBlockId === ec2.id && conn.toBlockId === volume.id) ||
        (conn.fromBlockId === volume.id && conn.toBlockId === ec2.id)
      );

      if (volumeConnection) {
        console.log(`[EC2CodeGen] Volume ${volume.id.substring(0, 8)} 연결 발견:`, {
          stackConnection: volumeConnection.properties?.stackConnection,
          volumeType: volumeConnection.properties?.volumeType,
          fromTo: `${volumeConnection.fromBlockId.substring(0, 8)} → ${volumeConnection.toBlockId.substring(0, 8)}`
        });
      }

      return volumeConnection?.properties?.stackConnection === true &&
        volumeConnection?.properties?.volumeType === 'boot';
    });

    if (bootVolume) {
      console.log(`✅ [EC2CodeGen] 부트볼륨 찾음: ${bootVolume.id.substring(0, 8)} (${bootVolume.properties.name})`);
    } else {
      console.log(`❌ [EC2CodeGen] 부트볼륨 없음`);
    }

    let code = `# EC2 Instance: ${ec2.properties.name || ec2.name}
resource "aws_instance" "${this.sanitizeResourceName(ec2.id)}" {
  ami           = "${ami}"
  instance_type = "${instanceType}"
  subnet_id     = ${subnetRef}

`;

    // 부트볼륨이 있는 경우 root_block_device 설정
    if (bootVolume) {
      const volumeSize = bootVolume.properties.volumeSize || 20;
      const volumeType = bootVolume.properties.volumeType || "gp3";
      code += `  # 부트볼륨 설정 (스태킹: ${bootVolume.properties.name || bootVolume.name})
  root_block_device {
    volume_size = ${volumeSize}
    volume_type = "${volumeType}"
    delete_on_termination = true
  }

`;
    }

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

    // 추가 EBS Volume 연결 (Road 연결만 - 스태킹도 아니고 연결도 없으면 무시)
    volumes.forEach((volume) => {
      // 이 EC2와 Volume 사이의 연결 찾기
      const volumeConnection = connections.find(conn =>
        (conn.fromBlockId === ec2.id && conn.toBlockId === volume.id) ||
        (conn.fromBlockId === volume.id && conn.toBlockId === ec2.id)
      );

      // 연결이 없으면 무시 (별개의 관계)
      if (!volumeConnection) {
        return;
      }

      // 스태킹 연결인지 확인 (부트볼륨)
      const isBootVolume = volumeConnection.properties?.stackConnection === true &&
        volumeConnection.properties?.volumeType === 'boot';

      // 부트볼륨이 아니고 Road 연결인 경우만 attachment 생성
      if (!isBootVolume) {
        code += `# EBS Volume Attachment (추가 볼륨 - Road 연결): ${volume.name} → ${ec2.name}
resource "aws_volume_attachment" "${this.sanitizeResourceName(ec2.id)}_${this.sanitizeResourceName(volume.id)}" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.${this.sanitizeResourceName(volume.id)}.id
  instance_id = aws_instance.${this.sanitizeResourceName(ec2.id)}.id
}

`;
      }
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

