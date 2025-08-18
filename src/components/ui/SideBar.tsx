import React from "react";
import { NavLink } from "react-router-dom";
import {
  FolderIcon,
  BookOpenIcon,
  CloudIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ROUTES } from "../../router/routes";
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    name: "Introduction",
    to: ROUTES.HOME,
    disabled: false,
    icon: BookOpenIcon,
  },
  {
    name: "Projects",
    to: ROUTES.DASHBOARD,
    disabled: false,
    icon: FolderIcon,
  },
  {
    name: "Deployments",
    to: ROUTES.DEPLOY_DASHBOARD,
    disabled: false,
    icon: CloudIcon, // ✅ 아이콘 변경
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => (
  <>
    <div
      className={`fixed inset-0 z-40 bg-black bg-opacity-50 sm:hidden ${
        isOpen ? "block" : "hidden"
      }`}
      onClick={onClose}
    />
    <div
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white p-6 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        sm:translate-x-0 sm:static sm:inset-auto sm:transform-none
      `}
    >
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center">
          <img
            src="/BlockCloud-logo.png"
            alt="BlockCloud"
            className="h-8 w-8 mr-2"
          />
          <span className="text-xl font-bold">BlockCloud</span>
        </div>
        <button className="sm:hidden" onClick={onClose}>
          <XMarkIcon className="h-6 w-6 text-gray-600" />
        </button>
      </div>
      <nav className="flex-1">
        <ul>
          {navItems.map(({ name, to, disabled, icon: Icon }) => (
            <li key={name} className="mb-3">
              <NavLink
                to={to}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `
        flex items-center p-2 rounded-lg
        ${
          disabled
            ? "text-gray-400 cursor-not-allowed"
            : isActive
            ? "bg-blue-50 text-blue-600 font-semibold"
            : "text-gray-600 hover:bg-gray-100"
        }
        `
                }
              >
                <Icon className="h-5 w-5 mr-3" />
                <span>{name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  </>
);

export default Sidebar;
