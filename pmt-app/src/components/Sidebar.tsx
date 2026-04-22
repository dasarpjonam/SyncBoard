import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Typography, Box, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { LayoutDashboard, Settings, FolderOpen, FolderPlus, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

export function Sidebar() {
  const { workspacePath, loadWorkspace, lockWorkspace, authSession } = useWorkspace();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const handleOpenWorkspace = async () => {
    const path = await window.electronAPI.openDirectory();
    if (path) {
      await loadWorkspace(path);
    }
  };

  const handleSetupNewWorkspace = async () => {
    const path = await window.electronAPI.openDirectory();
    if (path) {
      await loadWorkspace(path);
    }
  };

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/icon.svg" alt="Logo" style={{ width: 24, height: 24 }} />
            <Typography variant="h6" fontWeight="bold">
              Syncboard
            </Typography>
          </Box>
        )}
        {collapsed && (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src="/icon.svg" alt="Logo" style={{ width: 24, height: 24 }} />
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: '#374151' }} />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          {({ isActive }) => (
            <Tooltip title={collapsed ? 'Workspace' : ''} placement="right">
              <ListItemButton
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': { backgroundColor: '#374151' },
                  '&:hover': { backgroundColor: '#374151' },
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <ListItemIcon sx={{ color: '#ffffff', minWidth: collapsed ? 0 : 40 }}>
                  <LayoutDashboard size={20} />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="Workspace" />}
              </ListItemButton>
            </Tooltip>
          )}
        </NavLink>

        <NavLink to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
          {({ isActive }) => (
            <Tooltip title={collapsed ? 'Settings' : ''} placement="right">
              <ListItemButton
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': { backgroundColor: '#374151' },
                  '&:hover': { backgroundColor: '#374151' },
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <ListItemIcon sx={{ color: '#ffffff', minWidth: collapsed ? 0 : 40 }}>
                  <Settings size={20} />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="Settings" />}
              </ListItemButton>
            </Tooltip>
          )}
        </NavLink>
      </List>

      <Divider sx={{ borderColor: '#374151' }} />

      {/* Workspace Actions */}
      <Box sx={{ p: 1 }}>
        <Tooltip title={collapsed ? 'Open Workspace' : ''} placement="right">
          <ListItemButton
            onClick={handleOpenWorkspace}
            sx={{
              borderRadius: 1,
              '&:hover': { backgroundColor: '#374151' },
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon sx={{ color: '#ffffff', minWidth: collapsed ? 0 : 40 }}>
              <FolderOpen size={20} />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={workspacePath ? 'Change Workspace' : 'Open Workspace'}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        <Tooltip title={collapsed ? 'New Workspace' : ''} placement="right">
          <ListItemButton
            onClick={handleSetupNewWorkspace}
            sx={{
              borderRadius: 1,
              '&:hover': { backgroundColor: '#374151' },
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon sx={{ color: '#ffffff', minWidth: collapsed ? 0 : 40 }}>
              <FolderPlus size={20} />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Setup New Workspace"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        {/* Lock Workspace button - only show if authenticated */}
        {authSession?.isAuthenticated && (
          <Tooltip title={collapsed ? 'Lock Workspace' : ''} placement="right">
            <ListItemButton
              onClick={lockWorkspace}
              sx={{
                borderRadius: 1,
                '&:hover': { backgroundColor: '#374151' },
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <ListItemIcon sx={{ color: '#ffffff', minWidth: collapsed ? 0 : 40 }}>
                <Lock size={20} />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary="Lock Workspace"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        )}

        {workspacePath && !collapsed && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              px: 2,
              color: '#9ca3af',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={workspacePath}
          >
            {workspacePath.split('/').pop() || workspacePath.split('\\').pop()}
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: '#374151' }} />

      {/* Collapse Toggle - Desktop only */}
      {!isMobile && (
        <Box sx={{ p: 1, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <IconButton
              onClick={toggleCollapse}
              sx={{ color: '#ffffff', '&:hover': { backgroundColor: '#374151' } }}
              size="small"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              backgroundColor: '#1f2937',
              color: '#ffffff',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop Drawer */
        <Drawer
          variant="permanent"
          sx={{
            width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH,
              boxSizing: 'border-box',
              backgroundColor: '#1f2937',
              color: '#ffffff',
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
}
