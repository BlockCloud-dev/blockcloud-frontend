import type { DroppedBlock, Connection } from "../types/blocks";

export function generateTerraformCode(
  blocks: DroppedBlock[],
  connections: Connection[] = []
): string {
  // 디버깅: 연결 상태 로깅
  console.log("🔧 [CodeGenerator] Starting code generation");
  console.log("🔧 [CodeGenerator] Blocks:", blocks.length);
  console.log("🔧 [CodeGenerator] Connections:", connections.length);

  // 스택킹 연결만 별도로 로깅
  const stackingConnections = connections.filter(
    (conn) => conn.properties?.stackConnection
  );
  console.log(
    "🔧 [CodeGenerator] Stacking connections:",
    stackingConnections.length
  );
  stackingConnections.forEach((conn) => {
    console.log(
      "  🔗",
      conn.connectionType,
      "from:",
      conn.fromBlockId,
      "to:",
      conn.toBlockId
    );
  });

  if (!blocks.length) {
    return `# 아직 블록이 없습니다. 
# 팔레트에서 블록을 드래그하여 캔버스에 배치하세요.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # 최신 버전 사용
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

  let code = `# 레고 클라우드 인프라 빌더로 생성된 Terraform 코드
# 마지막 업데이트: ${new Date().toLocaleString()}
# 총 블록 수: ${blocks.length}개
# 총 연결 수: ${connections.length}개

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # 최신 버전 사용
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

  // VPC 먼저 생성
  const vpcs = blocks.filter((block) => block.type === "vpc");
  if (vpcs.length > 0) {
    code += `# VPC 리소스\n`;
    vpcs.forEach((vpc) => {
      const vpcId = vpc.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      code += `resource "aws_vpc" "${vpcId}" {
  cidr_block           = "${vpc.properties.cidrBlock || "10.0.0.0/16"}"
  enable_dns_support   = ${
    vpc.properties.enableDnsSupport !== false ? "true" : "false"
  }
  enable_dns_hostnames = ${
    vpc.properties.enableDnsHostnames !== false ? "true" : "false"
  }

  tags = {
    Name = "${vpc.properties.name}"
    ResourceType = "Network"
    Tier = "Foundation"
  }
}

`;
    });
  } // 서브넷 생성
  const subnets = blocks.filter((block) => block.type === "subnet");
  if (subnets.length > 0) {
    code += `# 서브넷 리소스\n`;
    subnets.forEach((subnet) => {
      const subnetId = subnet.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

      // 연결된 VPC 찾기 (물리적 스택킹 연결만 사용)
      let vpcRef = '"vpc-12345"';
      console.log(
        "🔍 [Subnet] Looking for VPC connection for subnet:",
        subnet.id
      );

      const vpcConnection = connections.find(
        (conn) =>
          conn.fromBlockId === subnet.id && conn.connectionType === "subnet-vpc"
      );

      console.log("🔍 [Subnet] VPC connection found:", vpcConnection);

      if (vpcConnection) {
        const connectedVpc = blocks.find(
          (block) => block.id === vpcConnection.toBlockId
        );
        console.log("🔍 [Subnet] Connected VPC block:", connectedVpc);
        if (connectedVpc) {
          vpcRef = `aws_vpc.${connectedVpc.id
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .toLowerCase()}.id`;
          console.log("✅ [Subnet] VPC reference set to:", vpcRef);
        }
      } else {
        console.log(
          "❌ [Subnet] No VPC connection found, using fallback:",
          vpcRef
        );
      }

      code += `resource "aws_subnet" "${subnetId}" {
  vpc_id            = ${vpcRef}
  cidr_block        = "${subnet.properties.cidrBlock || "10.0.1.0/24"}"
  availability_zone = "${
    subnet.properties.availabilityZone || "ap-northeast-2a"
  }"

  tags = {
    Name = "${subnet.properties.name}"
    ResourceType = "Network"
    Tier = "Subnet"
    AZ = "${subnet.properties.availabilityZone || "ap-northeast-2a"}"
  }
}

`;
    });
  } // EC2 인스턴스 생성
  const ec2Instances = blocks.filter((block) => block.type === "ec2");
  if (ec2Instances.length > 0) {
    code += `# EC2 인스턴스 리소스\n`;
    ec2Instances.forEach((ec2) => {
      const ec2Id = ec2.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

      // 연결된 서브넷 찾기 (연결 정보만 사용)
      let subnetRef = '"subnet-12345"';
      const subnetConnection = connections.find(
        (conn) =>
          conn.fromBlockId === ec2.id && conn.connectionType === "ec2-subnet"
      );

      if (subnetConnection) {
        const connectedSubnet = blocks.find(
          (block) => block.id === subnetConnection.toBlockId
        );
        if (connectedSubnet) {
          subnetRef = `aws_subnet.${connectedSubnet.id
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .toLowerCase()}.id`;
        }
      }

      // 연결된 보안 그룹들 찾기
      const securityGroupConnections = connections.filter(
        (conn) =>
          conn.fromBlockId === ec2.id &&
          conn.connectionType === "ec2-security-group"
      );

      let securityGroupRefs: string[] = [];
      securityGroupConnections.forEach((sgConn) => {
        const connectedSG = blocks.find(
          (block) => block.id === sgConn.toBlockId
        );
        if (connectedSG) {
          securityGroupRefs.push(
            `aws_security_group.${connectedSG.id
              .replace(/[^a-zA-Z0-9_]/g, "_")
              .toLowerCase()}.id`
          );
        }
      });

      code += `resource "aws_instance" "${ec2Id}" {
  ami           = "${ec2.properties.ami || "ami-12345678"}"
  instance_type = "${ec2.properties.instanceType || "t2.micro"}"
  subnet_id     = ${subnetRef}`;

      if (securityGroupRefs.length > 0) {
        code += `
  security_groups = [${securityGroupRefs.join(", ")}]`;
      }

      code += `

  tags = {
    Name = "${ec2.properties.name}"
    ResourceType = "Compute"
    InstanceType = "${ec2.properties.instanceType || "t2.micro"}"
    Purpose = "Application"
  }
}

`;
    });
  }

  // 보안 그룹 생성
  const securityGroups = blocks.filter(
    (block) => block.type === "security-group"
  );
  if (securityGroups.length > 0) {
    code += `# 보안 그룹 리소스\n`;
    securityGroups.forEach((sg) => {
      const sgId = sg.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

      // VPC 참조 - 스택킹 연결 정보 우선 사용
      let vpcRef = '"vpc-12345"';

      // security-group-subnet 연결에서 서브넷을 찾고, 그 서브넷의 VPC 찾기
      const subnetConnection = connections.find(
        (conn) =>
          conn.fromBlockId === sg.id &&
          conn.connectionType === "security-group-subnet"
      );

      if (subnetConnection) {
        const connectedSubnet = blocks.find(
          (block) => block.id === subnetConnection.toBlockId
        );
        if (connectedSubnet) {
          // 서브넷의 VPC 연결 찾기
          const subnetVpcConnection = connections.find(
            (conn) =>
              conn.fromBlockId === connectedSubnet.id &&
              conn.connectionType === "subnet-vpc"
          );
          if (subnetVpcConnection) {
            const connectedVpc = blocks.find(
              (block) => block.id === subnetVpcConnection.toBlockId
            );
            if (connectedVpc) {
              vpcRef = `aws_vpc.${connectedVpc.id
                .replace(/[^a-zA-Z0-9_]/g, "_")
                .toLowerCase()}.id`;
            }
          }
        }
      } else if (vpcs.length > 0) {
        // 스택킹 연결이 없으면 첫 번째 VPC 사용
        vpcRef = `aws_vpc.${vpcs[0].id
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .toLowerCase()}.id`;
      }

      // 인그레스/이그레스 규칙 처리
      let ingressRules = "";
      let egressRules = "";

      if (
        sg.properties.securityRules &&
        sg.properties.securityRules.length > 0
      ) {
        sg.properties.securityRules.forEach((rule) => {
          if (rule.type === "ingress") {
            ingressRules += `
  ingress {
    from_port   = ${rule.fromPort}
    to_port     = ${rule.toPort}
    protocol    = "${rule.protocol}"
    cidr_blocks = ["${rule.cidrBlocks.join('", "')}"]
  }`;
          } else {
            egressRules += `
  egress {
    from_port   = ${rule.fromPort}
    to_port     = ${rule.toPort}
    protocol    = "${rule.protocol}"
    cidr_blocks = ["${rule.cidrBlocks.join('", "')}"]
  }`;
          }
        });
      } else {
        // 기본 규칙
        ingressRules = `
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }`;

        egressRules = `
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }`;
      }

      code += `resource "aws_security_group" "${sgId}" {
  name        = "${sg.properties.name}"
  description = "Security group for ${sg.properties.name}"
  vpc_id      = ${vpcRef}${ingressRules}${egressRules}

  tags = {
    Name = "${sg.properties.name}"
  }
}

`;
    });
  }

  // 로드 밸런서 생성
  const loadBalancers = blocks.filter(
    (block) => block.type === "load-balancer"
  );
  if (loadBalancers.length > 0) {
    code += `# 로드 밸런서 리소스\n`;
    loadBalancers.forEach((lb) => {
      const lbId = lb.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

      // 연결된 서브넷들 찾기
      const subnetConnections = connections.filter(
        (conn) =>
          conn.fromBlockId === lb.id &&
          conn.connectionType === "load-balancer-subnet"
      );

      let subnetRefs: string[] = [];
      subnetConnections.forEach((subnetConn) => {
        const connectedSubnet = blocks.find(
          (block) => block.id === subnetConn.toBlockId
        );
        if (connectedSubnet) {
          subnetRefs.push(
            `aws_subnet.${connectedSubnet.id
              .replace(/[^a-zA-Z0-9_]/g, "_")
              .toLowerCase()}.id`
          );
        }
      });

      // 연결된 서브넷이 없으면 기본값 사용
      if (subnetRefs.length === 0) {
        subnetRefs = ['"subnet-12345"', '"subnet-67890"'];
      }

      // 연결된 보안 그룹들 찾기
      const securityGroupConnections = connections.filter(
        (conn) =>
          conn.fromBlockId === lb.id &&
          conn.connectionType === "load-balancer-security-group"
      );

      let securityGroupRefs: string[] = [];
      securityGroupConnections.forEach((sgConn) => {
        const connectedSG = blocks.find(
          (block) => block.id === sgConn.toBlockId
        );
        if (connectedSG) {
          securityGroupRefs.push(
            `aws_security_group.${connectedSG.id
              .replace(/[^a-zA-Z0-9_]/g, "_")
              .toLowerCase()}.id`
          );
        }
      });

      // ALB/NLB에 따라 다른 리소스 생성
      if (lb.properties.loadBalancerType === "network") {
        code += `resource "aws_lb" "${lbId}" {
  name               = "${lb.properties.name}"
  internal           = false
  load_balancer_type = "network"
  subnets            = [${subnetRefs.join(", ")}]

  tags = {
    Name = "${lb.properties.name}"
  }
}

`;
      } else {
        code += `resource "aws_lb" "${lbId}" {
  name               = "${lb.properties.name}"
  internal           = false
  load_balancer_type = "application"
  subnets            = [${subnetRefs.join(", ")}]`;

        if (securityGroupRefs.length > 0) {
          code += `
  security_groups    = [${securityGroupRefs.join(", ")}]`;
        }

        code += `

  tags = {
    Name = "${lb.properties.name}"
  }
}

`;
      }

      // 연결된 EC2 인스턴스가 있으면 타겟 그룹과 타겟 그룹 연결 생성
      const ec2Connections = connections.filter(
        (conn) =>
          conn.fromBlockId === lb.id &&
          conn.connectionType === "load-balancer-ec2"
      );

      if (ec2Connections.length > 0) {
        // 타겟 그룹 생성
        code += `resource "aws_lb_target_group" "${lbId}_tg" {
  name     = "${lb.properties.name}-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = ${
    vpcs.length > 0
      ? `aws_vpc.${vpcs[0].id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()}.id`
      : '"vpc-12345"'
  }

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${lb.properties.name}-tg"
  }
}

`;

        // 타겟 그룹 연결
        ec2Connections.forEach((ec2Conn, index) => {
          const connectedEC2 = blocks.find(
            (block) => block.id === ec2Conn.toBlockId
          );
          if (connectedEC2) {
            const ec2Id = connectedEC2.id
              .replace(/[^a-zA-Z0-9_]/g, "_")
              .toLowerCase();
            code += `resource "aws_lb_target_group_attachment" "${lbId}_tg_attachment_${index}" {
  target_group_arn = aws_lb_target_group.${lbId}_tg.arn
  target_id        = aws_instance.${ec2Id}.id
  port             = 80
}

`;
          }
        });

        // 리스너 생성
        code += `resource "aws_lb_listener" "${lbId}_listener" {
  load_balancer_arn = aws_lb.${lbId}.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.${lbId}_tg.arn
  }
}

`;
      }
    });
  }

  // EBS 볼륨 생성
  const volumes = blocks.filter((block) => block.type === "volume");
  if (volumes.length > 0) {
    code += `# EBS 볼륨 리소스\n`;
    volumes.forEach((volume) => {
      const volumeId = volume.id.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

      code += `resource "aws_ebs_volume" "${volumeId}" {
  availability_zone = "ap-northeast-2a"
  size              = ${volume.properties.volumeSize || 8}
  type              = "${volume.properties.volumeType || "gp2"}"

  tags = {
    Name = "${volume.properties.name}"
  }
}

`;

      // 연결된 EC2 인스턴스 찾기 (연결 정보만 사용) - 양방향 연결 확인
      console.log(
        "🔧 [EBS] Looking for EC2 connections for volume:",
        volume.id
      );

      const volumeConnection = connections.find(
        (conn) =>
          (conn.fromBlockId === volume.id &&
            conn.connectionType === "volume-ec2") ||
          (conn.toBlockId === volume.id && conn.connectionType === "ec2-volume")
      );

      console.log("🔧 [EBS] Volume connection found:", volumeConnection);

      if (volumeConnection) {
        // 연결된 EC2 찾기 (연결 방향에 따라 다름)
        const ec2BlockId =
          volumeConnection.fromBlockId === volume.id
            ? volumeConnection.toBlockId
            : volumeConnection.fromBlockId;

        const attachedEC2 = blocks.find((block) => block.id === ec2BlockId);

        console.log("🔧 [EBS] Connected EC2 block:", attachedEC2);

        if (attachedEC2) {
          const ec2Id = attachedEC2.id
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .toLowerCase();

          // 연결 속성에 따라 디바이스 이름과 설명 결정
          const isBootVolume =
            volumeConnection.properties?.volumeType === "boot" ||
            volumeConnection.properties?.stackConnection === true;
          const deviceName = isBootVolume ? '"/dev/sda1"' : '"/dev/sdf"';
          const description = isBootVolume ? "부트 볼륨" : "추가 블록 스토리지";

          console.log("🔧 [EBS] Volume attachment details:", {
            ec2Id,
            deviceName,
            isBootVolume,
            description,
            connectionType: volumeConnection.connectionType,
            properties: volumeConnection.properties,
          });

          code += `# ${description} 연결 - ${attachedEC2.properties.name} ↔ ${volume.properties.name}
resource "aws_volume_attachment" "${volumeId}_attachment" {
  device_name = ${deviceName}
  volume_id   = aws_ebs_volume.${volumeId}.id
  instance_id = aws_instance.${ec2Id}.id
}

`;
        }
      } else {
        console.log("🔧 [EBS] No EC2 connection found for volume:", volume.id);
      }
    });
  }

  // 연결 정보 요약 주석 추가
  if (connections.length > 0) {
    code += `# ===============================================
# 🔗 연결 정보 요약 (총 ${connections.length}개)
# ===============================================
`;
    connections.forEach((conn) => {
      const fromBlock = blocks.find((b) => b.id === conn.fromBlockId);
      const toBlock = blocks.find((b) => b.id === conn.toBlockId);
      const fromName = fromBlock?.properties.name || "Unknown";
      const toName = toBlock?.properties.name || "Unknown";
      const typeLabel = getConnectionTypeLabel(conn.connectionType);

      code += `# ${fromName} → ${toName} (${typeLabel})\n`;
    });
    code += `# ===============================================\n\n`;
  }

  return code;
}

// 연결 타입의 한글 라벨을 반환하는 헬퍼 함수
function getConnectionTypeLabel(connectionType: string): string {
  const labels: Record<string, string> = {
    "ec2-security-group": "EC2 ↔ 보안그룹",
    "ec2-subnet": "EC2 ↔ 서브넷",
    "ec2-volume": "EC2 ↔ EBS볼륨",
    "load-balancer-ec2": "로드밸런서 ↔ EC2",
    "load-balancer-security-group": "로드밸런서 ↔ 보안그룹",
    "load-balancer-subnet": "로드밸런서 ↔ 서브넷",
    "security-group-subnet": "보안그룹 ↔ 서브넷",
    "subnet-vpc": "서브넷 ↔ VPC",
  };
  return labels[connectionType] || connectionType;
}
