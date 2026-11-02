import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import AdbIcon from "@mui/icons-material/Adb";
import ColorModeContext from "../themes/ToggleContext";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import Badge from "@mui/material/Badge";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import {useSession, isAdmin} from "../session";
const pages = [{label: "Home", href: "#"}, {label: "3D Gallery", href: "#gallery"}];

/**
 * @return {AppBar} app bar
 */
const ResponsiveAppBar=()=> {
  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const colorMode = React.useContext(ColorModeContext);
  const {session, logout} = useSession();
  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  // what the signed-in user can open from their avatar
  const userMenu = session ? [
    {label: "Dashboard", href: "#me"},
    {label: "Profile", href: "#me/profile"},
    ...(isAdmin(session) ? [{label: `審核${session.pendingReviews ? `（${session.pendingReviews}）` : ""}`, href: "#admin/review"}] : []),
    {label: "Logout", onClick: logout},
  ] : [];


  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <AdbIcon sx={{display: {xs: "none", md: "flex"}, mr: 1}} />
          <Typography
            variant="h6"
            noWrap
            component="a"
            sx={{
              mr: 2,
              display: {xs: "none", md: "flex"},
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            IGallery
          </Typography>

          <Box sx={{flexGrow: 1, display: {xs: "flex", md: "none"}}}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: {xs: "block", md: "none"},
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page.label} component="a" href={page.href} onClick={handleCloseNavMenu}>
                  <Typography textAlign="center">{page.label}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <AdbIcon sx={{display: {xs: "flex", md: "none"}, mr: 1}} />

          <Box sx={{flexGrow: 1, display: {xs: "none", md: "flex"}}}>
            {pages.map((page) => (
              <Button
                key={page.label}
                href={page.href}
                onClick={handleCloseNavMenu}
                sx={{my: 2, color: "white", display: "block"}}
              >
                {page.label}
              </Button>
            ))}
          </Box>
          <IconButton onClick={colorMode.toggleColorMode} sx={{marginRight: 2}}>
            <WbSunnyIcon/>
          </IconButton>


          {session === null && (
            <Button href="#login" variant="outlined" color="inherit">登入</Button>
          )}
          {session && (
            <Tooltip title="通知">
              <IconButton href="#me/notifications" sx={{marginRight: 2, color: "inherit"}} aria-label="通知">
                <Badge badgeContent={session.unreadNotifications} color="error" max={99}>
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          {session && <Box sx={{flexGrow: 0}}>
            <Tooltip title={session.user.displayName}>
              <IconButton onClick={handleOpenUserMenu} sx={{p: 0}} aria-label="帳號選單">
                <Avatar sx={{bgcolor: "secondary.main"}}>{session.user.displayName.slice(0, 1)}</Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              sx={{mt: "45px"}}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {userMenu.map((item) => (
                <MenuItem
                  key={item.label}
                  component={item.href ? "a" : "li"}
                  href={item.href}
                  onClick={() => {
                    handleCloseUserMenu();
                    if (item.onClick) item.onClick();
                  }}
                >
                  <Typography textAlign="center">{item.label}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default ResponsiveAppBar;
