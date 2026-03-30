/**
 * OpenDeck — LucideIcon wrapper
 * Maps icon name strings to lucide-react-native components.
 */

import React from 'react';
import {
  Mic, MicOff, Headphones, Radio, Circle, Monitor, Layout,
  Terminal, Keyboard, ExternalLink, Volume2, Volume1, VolumeX,
  Play, SkipForward, SkipBack, Music, Settings, Plus,
  LayoutGrid, Trash2, Edit2, ChevronRight, ChevronLeft,
  Wifi, WifiOff, Zap, Bell, Check, X, AlertCircle,
  Home, Search, User, Star, Heart, Bookmark,
  MessageCircle, Phone, Video, Camera, Image,
  Download, Upload, Share2, Copy, Link,
  Clock, Calendar, BarChart2, Activity,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'mic': Mic,
  'mic-off': MicOff,
  'headphones': Headphones,
  'radio': Radio,
  'circle': Circle,
  'monitor': Monitor,
  'layout': Layout,
  'terminal': Terminal,
  'keyboard': Keyboard,
  'external-link': ExternalLink,
  'volume-2': Volume2,
  'volume-1': Volume1,
  'volume-x': VolumeX,
  'play': Play,
  'skip-forward': SkipForward,
  'skip-back': SkipBack,
  'music': Music,
  'settings': Settings,
  'plus': Plus,
  'layout-grid': LayoutGrid,
  'trash-2': Trash2,
  'edit-2': Edit2,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'zap': Zap,
  'bell': Bell,
  'check': Check,
  'x': X,
  'alert-circle': AlertCircle,
  'home': Home,
  'search': Search,
  'user': User,
  'star': Star,
  'heart': Heart,
  'bookmark': Bookmark,
  'message-circle': MessageCircle,
  'phone': Phone,
  'video': Video,
  'camera': Camera,
  'image': Image,
  'download': Download,
  'upload': Upload,
  'share-2': Share2,
  'copy': Copy,
  'link': Link,
  'clock': Clock,
  'calendar': Calendar,
  'bar-chart-2': BarChart2,
  'activity': Activity,
};

interface LucideIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const LucideIcon: React.FC<LucideIconProps> = ({ name, size = 20, color = '#e8e8e8' }) => {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    // Fallback — show a dot
    return <Zap size={size} color={color} />;
  }
  return <IconComponent size={size} color={color} />;
};
