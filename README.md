# 🧱 3D Lego AWS Infrastructure Builder

A revolutionary visual infrastructure builder that lets you construct AWS cloud infrastructure using 3D Lego-style blocks. Drag, drop, connect, and watch your architecture come to life while generating production-ready Terraform code in real-time.

![3D Lego AWS Builder](https://via.placeholder.com/800x400/1a202c/white?text=3D+Lego+AWS+Infrastructure+Builder)

## ✨ Features

### 🎯 Visual Infrastructure Design
- **3D Lego Blocks**: Each AWS service is represented as a unique Lego-style block
- **Drag & Drop**: Intuitive building experience with grid snapping
- **Flat Panel Roads**: Modern flat-style road connections between services
- **Physical Stacking**: AWS architecture-compliant infrastructure layering
- **Interactive 3D Scene**: Professional lighting, shadows, and camera controls

### 🏗️ AWS Architecture Intelligence
- **Smart Stacking**: Automatic VPC → Subnet → Service layer detection
- **Road Network**: Color-coded service communication paths
- **AWS-Compliant**: Follows real AWS infrastructure relationships
- **Auto-Connections**: Physical stacking creates infrastructure connections automatically
- **Manual Roads**: Service-level connections via interactive road building

### 🏗️ AWS Services Support
- **🏢 EC2** - Office buildings for compute instances
- **🌐 VPC** - Network foundations
- **🛣️ Subnets** - Highway segments for network isolation
- **🏪 S3** - Warehouses for object storage
- **🗄️ RDS** - Database towers
- **⚖️ ALB** - Traffic light load balancers
- **🛡️ Security Groups** - Guard posts for security
- **⚡ Lambda** - Function boxes for serverless
- **🚪 API Gateway** - Gateway arches for APIs

### 💻 Advanced Code Generation
- **Terraform HCL**: Production-ready infrastructure as code
- **Monaco Editor**: Professional code editing with syntax highlighting
- **Real-time Generation**: Code updates as you build
- **Export Functionality**: Download your Terraform files

### 🎮 Interactive Experience
- **Keyboard Shortcuts**: Professional workflow with hotkeys
- **Property Editing**: Configure AWS resource parameters
- **Connection Management**: Link services with visual feedback
- **Help System**: Interactive tutorials and guides

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 3d-lego-aws-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎯 How to Use

### 1. Building Infrastructure
1. **Select Components**: Click AWS service blocks from the left palette
2. **Drag & Drop**: Place blocks in the 3D scene with automatic grid snapping
3. **Physical Stacking**: Stack components following AWS architecture (VPC → Subnet → EC2/SG/LB)
4. **Road Connections**: Use connection mode for service communications (EC2 ↔ Security Group, EC2 ↔ EBS)
5. **Configure Properties**: Use the right panel to edit resource parameters

### 2. AWS Architecture Rules
- **🏗️ Physical Stacking (Infrastructure Layers)**:
  - VPC (Foundation) → Subnet → EC2, Security Group, Load Balancer
  - Automatic connections created when stacking
- **🛣️ Road Connections (Service Communications)**:
  - EC2 ↔ Security Group (access control)
  - EC2 ↔ EBS Volume (storage attachment)
  - Load Balancer ↔ EC2 (traffic distribution)
  - Load Balancer ↔ Security Group (security rules)

### 3. Connection Types
- **Flat Panel Roads**: Modern flat-style roads instead of cylindrical
- **Color-coded**: Different colors for different connection types
- **Auto-detection**: Physical stacking automatically creates infrastructure connections
- **Manual Roads**: Service connections require manual road creation

### 4. Keyboard Shortcuts
- `Delete` - Remove selected component
- `Escape` - Deselect all components
- `Ctrl + G` - Generate Terraform code
- `Ctrl + Shift + C` - Clear entire workspace
- `F1` - Show help and tutorials

### 5. Code Generation
- **Real-time Updates**: Terraform code generates automatically
- **Export**: Click the download button to save `.tf` files
- **Validation**: Built-in syntax checking and best practices

## 🏗️ Architecture

### Technology Stack
- **React 18** - Modern UI framework
- **Three.js + React Three Fiber** - 3D graphics and interactions
- **TypeScript** - Type-safe development
- **Zustand** - Lightweight state management
- **Monaco Editor** - Professional code editing
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast development and building

### Project Structure
```
src/
├── components/
│   ├── three/              # 3D scene components
│   │   ├── BaseLegoBlock.tsx
│   │   ├── ConnectionLine.tsx
│   │   └── Scene.tsx
│   └── ui/                 # User interface components
│       ├── BlockPalette.tsx
│       ├── CodeEditor.tsx
│       ├── PropertyPanel.tsx
│       ├── Toolbar.tsx
│       └── StatusBar.tsx
├── hooks/                  # Custom React hooks
├── store/                  # State management
├── types/                  # TypeScript definitions
└── utils/                  # Utility functions
```

## 🎨 Customization

### Adding New AWS Services
1. Define the service in `types/infrastructure.ts`
2. Create block template in `utils/blockTemplates.ts`
3. Add Terraform generation logic in `store/infrastructureStore.ts`

### Styling Modifications
- Lego colors defined in `tailwind.config.js`
- 3D materials and lighting in `components/three/`
- UI components use Tailwind utility classes

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Testing
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## 🔮 Roadmap

### Upcoming Features
- **🔄 Import Terraform** - Load existing `.tf` files
- **🌍 Multi-Region Support** - Global infrastructure visualization
- **💰 Cost Estimation** - Real-time AWS pricing
- **✅ Validation** - Infrastructure best practices checking
- **🎵 Sound Effects** - Audio feedback for interactions
- **📱 Mobile Support** - Touch-friendly interface

### Advanced Capabilities
- **Team Collaboration** - Real-time multi-user editing
- **Version Control** - Infrastructure change tracking
- **Templates** - Pre-built architecture patterns
- **Integration** - CI/CD pipeline connections

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js Community** - For excellent 3D web graphics
- **AWS** - For comprehensive cloud services
- **LEGO Group** - For inspiring the block-based design concept
- **Terraform** - For infrastructure as code innovation

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/3d-lego-aws-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/3d-lego-aws-builder/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/3d-lego-aws-builder/wiki)

---

**Built with ❤️ by developers who believe infrastructure should be as fun as playing with LEGO blocks!**
