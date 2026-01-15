import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Position } from '@/types';

interface SignupData {
  employeeId: string;
  name: string;
  company: string;
  department: string;
  rank: string;
  position: Position;
  email: string;
  password: string;
}

interface FindPasswordResult {
  success: boolean;
  message?: string;
  tempPassword?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (employeeId: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  findPassword: (employeeId: string, method: 'email' | 'phone', contact: string) => Promise<FindPasswordResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 사내 메일 도메인 강제
const COMPANY_EMAIL_DOMAIN = '@okfngroup.com';
const normalizeCompanyEmail = (email: string): string => {
  const trimmed = email.trim();
  if (trimmed.toLowerCase().endsWith(COMPANY_EMAIL_DOMAIN)) return trimmed;
  const local = trimmed.replace(/@.*/, '');
  return `${local}${COMPANY_EMAIL_DOMAIN}`;
};

// 데모용 사용자 데이터
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'EMP001': {
    password: '1234',
    user: {
      id: '1',
      employeeId: 'EMP001',
      name: '김철수',
      company: 'OKH',
      department: '개발팀',
      rank: '대리',
      position: '팀원',
      email: 'kim@okfngroup.com',
      role: 'employee',
    },
  },
  'ADMIN001': {
    password: 'admin',
    user: {
      id: '2',
      employeeId: 'ADMIN001',
      name: '박관리',
      company: 'OKH',
      department: '인재개발팀',
      rank: '차장',
      position: '팀장',
      email: 'admin@okfngroup.com',
      role: 'admin',
    },
  },
  'SYS001': {
    password: 'system',
    user: {
      id: '3',
      employeeId: 'SYS001',
      name: '이시스템',
      company: 'OKH',
      department: 'IT운영팀',
      rank: '차장',
      position: '팀장',
      email: 'system@okfngroup.com',
      role: 'system_admin',
    },
  },
};

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30분

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }, []);

  // 비활성 타이머 체크
  useEffect(() => {
    const checkInactivity = () => {
      if (user && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
      }
    };

    const interval = setInterval(checkInactivity, 60000); // 1분마다 체크
    return () => clearInterval(interval);
  }, [user, lastActivity, logout]);

  // 사용자 활동 감지
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  // 초기 로드 시 저장된 인증 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (employeeId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // 데모: 실제 구현 시 API 호출
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // localStorage에서 사용자 데이터 확인
    const usersData = localStorage.getItem('registered_users');
    const registeredUsers = usersData ? JSON.parse(usersData) : {};
    
    // 기존 데모 사용자와 등록된 사용자 모두 확인
    const demoUser = DEMO_USERS[employeeId];
    const registeredUser = registeredUsers[employeeId];
    
    const userData = demoUser || registeredUser;
    
    if (userData && userData.password === password) {
      setUser(userData.user);
      localStorage.setItem('auth_user', JSON.stringify(userData.user));
      localStorage.setItem('auth_token', 'demo_token_' + Date.now());
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    setIsLoading(true);
    
    // 데모: 실제 구현 시 API 호출
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const normalizedEmail = normalizeCompanyEmail(data.email);
      // localStorage에서 기존 사용자 데이터 가져오기
      const usersData = localStorage.getItem('registered_users');
      const registeredUsers = usersData ? JSON.parse(usersData) : {};
      
      // 이미 등록된 사번인지 확인
      if (DEMO_USERS[data.employeeId] || registeredUsers[data.employeeId]) {
        setIsLoading(false);
        return false;
      }
      
      // 새 사용자 생성
      const newUser: User = {
        id: Date.now().toString(),
        employeeId: data.employeeId,
        name: data.name,
        company: data.company,
        department: data.department,
        rank: data.rank,
        position: data.position,
        email: normalizedEmail,
        role: 'employee', // 기본적으로 직원 권한
      };
      
      // 사용자 데이터 저장
      registeredUsers[data.employeeId] = {
        password: data.password, // 실제 환경에서는 해시화 필요
        user: newUser,
      };
      
      localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const findPassword = async (
    employeeId: string, 
    method: 'email' | 'phone', 
    contact: string
  ): Promise<FindPasswordResult> => {
    setIsLoading(true);
    
    // 데모: 실제 구현 시 API 호출
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // localStorage에서 등록된 사용자 데이터 가져오기
      const usersData = localStorage.getItem('registered_users');
      const registeredUsers = usersData ? JSON.parse(usersData) : {};
      
      // 기존 데모 사용자와 등록된 사용자 모두 확인
      const demoUser = DEMO_USERS[employeeId];
      const registeredUser = registeredUsers[employeeId];
      
      const userData = demoUser || registeredUser;
      
      if (!userData) {
        setIsLoading(false);
        return {
          success: false,
          message: '입력하신 사번과 일치하는 계정을 찾을 수 없습니다.',
        };
      }
      
      // 이메일 또는 연락처 확인
      const user = userData.user;
      const contactMatch = method === 'email' 
        ? user.email?.toLowerCase() === contact.toLowerCase()
        : user.phone?.replace(/-/g, '') === contact.replace(/-/g, '');
      
      if (!contactMatch) {
        setIsLoading(false);
        return {
          success: false,
          message: `입력하신 ${method === 'email' ? '이메일' : '연락처'}가 등록된 정보와 일치하지 않습니다.`,
        };
      }
      
      // 임시 비밀번호 생성 (실제 환경에서는 이메일/SMS로 발송)
      const tempPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 1000);
      
      // 비밀번호 업데이트
      if (demoUser) {
        // 데모 사용자는 수정하지 않음 (읽기 전용)
        setIsLoading(false);
        return {
          success: false,
          message: '데모 계정의 비밀번호는 변경할 수 없습니다.',
        };
      } else {
        // 등록된 사용자의 비밀번호 업데이트
        registeredUsers[employeeId].password = tempPassword;
        localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
      }
      
      setIsLoading(false);
      return {
        success: true,
        message: `임시 비밀번호가 ${method === 'email' ? '이메일' : 'SMS'}로 발송되었습니다. (데모: ${tempPassword})`,
        tempPassword, // 데모 환경에서만 표시
      };
    } catch (error) {
      console.error('Find password error:', error);
      setIsLoading(false);
      return {
        success: false,
        message: '비밀번호 찾기 중 오류가 발생했습니다.',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        findPassword,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
