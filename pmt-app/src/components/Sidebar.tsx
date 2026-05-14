import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Typography, Box, Tooltip, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from '@mui/material';
import { LayoutDashboard, Settings, ChevronLeft, ChevronRight, Lock, User, FolderPlus } from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { UserSelector } from './UserSelector';
import { getBasename } from '../lib/workspace-registry';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

export function Sidebar() {
  const { 
    workspacePath, 
    loadWorkspace, 
    lockWorkspace, 
    authSession, 
    config,
    currentUser,
    setCurrentUser,
    recentWorkspaces,
    addToRecentWorkspaces,
    removeFromRecentWorkspaces,
    isDirty,
    setIsDirty,
    addUserToWorkspace,
  } = useWorkspace();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const handleSwitchWorkspace = async (path: string) => {
    // Check if unsaved changes
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Switch workspace anyway?');
      if (!confirmed) return;
      setIsDirty(false);
    }
    await loadWorkspace(path);
  };

  const handleOpenNew = async () => {
    const path = await window.electronAPI.openDirectory();
    if (path) {
      const name = getBasename(path);
      await addToRecentWorkspaces(path, name);
      await handleSwitchWorkspace(path);
    }
  };

  const handleRemove = async (path: string) => {
    await removeFromRecentWorkspaces(path);
  };

  const [newWorkspaceDialogOpen, setNewWorkspaceDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [parentPathForNewWorkspace, setParentPathForNewWorkspace] = useState('');

  const handleCreateNewWorkspace = async () => {
    const parentPath = await window.electronAPI.openDirectory();
    if (!parentPath) return;

    setParentPathForNewWorkspace(parentPath);
    setNewWorkspaceName('');
    setNewWorkspaceDialogOpen(true);
  };

  const handleConfirmNewWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    const name = newWorkspaceName.trim();
    setNewWorkspaceDialogOpen(false);

    const separator = parentPathForNewWorkspace.includes('\\') ? '\\' : '/';
    const newWorkspacePath = `${parentPathForNewWorkspace}${separator}${name}`;
    
    const created = await window.electronAPI.ensureDir(newWorkspacePath);
    if (!created) {
      alert("Failed to create workspace directory. It might already exist or lack permissions.");
      return;
    }

    await addToRecentWorkspaces(newWorkspacePath, name);
    await handleSwitchWorkspace(newWorkspacePath);
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
      {/* Removed Header per user request */}

      {/* User Selector - show available users or allow adding */}
      <Box sx={{ p: 1 }}>
        <UserSelector
          currentUser={currentUser}
          availableUsers={config.users || []}
          onUserChange={setCurrentUser}
          onAddUser={addUserToWorkspace}
          collapsed={collapsed}
        />
      </Box>

      <Divider sx={{ borderColor: '#374151' }} />

      {/* Workspace Switcher */}
      <Box sx={{ p: 1 }}>
        <WorkspaceSwitcher
          recentWorkspaces={recentWorkspaces}
          currentPath={workspacePath}
          collapsed={collapsed}
          onSwitch={handleSwitchWorkspace}
          onOpenNew={handleOpenNew}
          onRemove={handleRemove}
        />
      </Box>

      <Divider sx={{ borderColor: '#374151', my: 1 }} />

      {/* New Workspace button */}
      <Box sx={{ p: 1 }}>
        <Tooltip title={collapsed ? 'New Workspace' : ''} placement="right">
          <ListItemButton
            onClick={handleCreateNewWorkspace}
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
                primary="New Workspace"
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: '#374151' }} />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          {({ isActive }) => (
            <Tooltip title={collapsed ? 'Team space' : ''} placement="right">
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
                {!collapsed && <ListItemText primary="Team space" />}
              </ListItemButton>
            </Tooltip>
          )}
        </NavLink>

        <NavLink to="/personal" style={{ textDecoration: 'none', color: 'inherit' }}>
          {({ isActive }) => (
            <Tooltip title={collapsed ? 'My Space' : ''} placement="right">
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
                  <User size={20} />
                </ListItemIcon>
                {!collapsed && <ListItemText primary="My Space" />}
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

      {/* Lock Workspace button - only show if workspace has auth enabled and user is authenticated */}
      {config.auth?.enabled && authSession?.isAuthenticated && (
        <Box sx={{ p: 1 }}>
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
        </Box>
      )}

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
              overflow: 'visible',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* New Workspace Dialog */}
      <Dialog open={newWorkspaceDialogOpen} onClose={() => setNewWorkspaceDialogOpen(false)}>
        <DialogTitle>Create New Workspace</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter a name for the new workspace. A folder with this name will be created inside {parentPathForNewWorkspace}.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Workspace Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmNewWorkspace();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewWorkspaceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmNewWorkspace} variant="contained" color="primary" disabled={!newWorkspaceName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
