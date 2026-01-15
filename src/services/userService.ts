import { supabase } from '@/lib/supabaseClient';
import { User, UserRole, Position } from '@/types';

/**
 * Supabase users 테이블의 사용자 정보 타입
 */
export interface SupabaseUser {
  id: string;
  employee_id: string;
  name: string;
  company: string;
  department: string;
  rank: string;
  position: Position;
  email: string;
  phone?: string | null;
  role: UserRole;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

/**
 * 사용자 생성 데이터 타입 (비밀번호 해시 포함)
 */
export interface CreateUserData {
  employee_id: string;
  name: string;
  company: string;
  department: string;
  rank: string;
  position: Position;
  email: string;
  phone?: string | null;
  role?: UserRole;
  password_hash: string;
}

/**
 * Supabase User를 앱의 User 타입으로 변환
 */
function mapSupabaseUserToUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    employeeId: supabaseUser.employee_id,
    name: supabaseUser.name,
    company: supabaseUser.company,
    department: supabaseUser.department,
    rank: supabaseUser.rank,
    position: supabaseUser.position,
    email: supabaseUser.email,
    phone: supabaseUser.phone ?? null,
    role: supabaseUser.role,
  };
}

/**
 * 현재 로그인된 사용자(auth.uid)를 기준으로 users 테이블에서 사용자 정보를 조회
 * 사용자 레코드가 없을 경우 최초 1회 insert
 * 
 * @param defaultUserData 사용자 레코드가 없을 경우 생성할 기본 데이터 (선택사항)
 * @returns 사용자 정보 또는 null (인증되지 않은 경우)
 */
export async function getOrCreateCurrentUser(
  defaultUserData?: Omit<CreateUserData, 'password_hash'> & { password_hash?: string }
): Promise<User | null> {
  try {
    // 현재 인증된 사용자 확인
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('인증된 사용자가 없습니다:', authError);
      return null;
    }

    // users 테이블에서 사용자 정보 조회
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // 사용자가 이미 존재하는 경우
    if (existingUser && !selectError) {
      return mapSupabaseUserToUser(existingUser as SupabaseUser);
    }

    // 사용자가 존재하지 않는 경우 (최초 1회 insert)
    if (selectError && selectError.code === 'PGRST116') {
      // 레코드가 없는 경우 (PGRST116: no rows returned)
      // defaultUserData가 제공된 경우에만 insert 시도
      if (defaultUserData) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id, // auth.uid와 동일한 ID 사용
            employee_id: defaultUserData.employee_id,
            name: defaultUserData.name,
            company: defaultUserData.company,
            department: defaultUserData.department,
            rank: defaultUserData.rank,
            position: defaultUserData.position,
            email: defaultUserData.email,
            phone: defaultUserData.phone ?? null,
            role: defaultUserData.role || 'employee',
            password_hash: defaultUserData.password_hash || '', // 비밀번호 해시가 없으면 빈 문자열
          })
          .select()
          .single();

        if (insertError) {
          console.error('사용자 생성 중 오류 발생:', insertError);
          return null;
        }

        if (newUser) {
          return mapSupabaseUserToUser(newUser as SupabaseUser);
        }
      } else {
        // defaultUserData가 없으면 null 반환
        console.warn('users 테이블에 사용자 레코드가 없습니다. defaultUserData를 제공하여 생성할 수 있습니다.');
        return null;
      }
    }

    // 기타 에러 발생 시
    if (selectError) {
      console.error('사용자 조회 중 오류 발생:', selectError);
      return null;
    }

    return null;
  } catch (error) {
    console.error('getOrCreateCurrentUser 오류:', error);
    return null;
  }
}

/**
 * employee_id로 사용자 정보 조회
 * 
 * @param employeeId 사번
 * @returns 사용자 정보 또는 null
 */
export async function getUserByEmployeeId(employeeId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error) {
      console.error('사용자 조회 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseUserToUser(data as SupabaseUser);
  } catch (error) {
    console.error('getUserByEmployeeId 오류:', error);
    return null;
  }
}

/**
 * users 테이블에 새 사용자 생성
 * 
 * @param userData 사용자 생성 데이터
 * @returns 생성된 사용자 정보 또는 null
 */
export async function createUser(userData: CreateUserData): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        employee_id: userData.employee_id,
        name: userData.name,
        company: userData.company,
        department: userData.department,
        rank: userData.rank,
        position: userData.position,
        email: userData.email,
        phone: userData.phone,
        role: userData.role || 'employee',
        password_hash: userData.password_hash,
      })
      .select()
      .single();

    if (error) {
      console.error('사용자 생성 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseUserToUser(data as SupabaseUser);
  } catch (error) {
    console.error('createUser 오류:', error);
    return null;
  }
}

/**
 * 사용자 정보 업데이트
 * 
 * @param userId 사용자 ID
 * @param updates 업데이트할 필드들
 * @returns 업데이트된 사용자 정보 또는 null
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<CreateUserData, 'password_hash'>> & { password_hash?: string }
): Promise<User | null> {
  try {
    const updateData: Record<string, any> = {};
    
    if (updates.employee_id !== undefined) updateData.employee_id = updates.employee_id;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.rank !== undefined) updateData.rank = updates.rank;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.password_hash !== undefined) updateData.password_hash = updates.password_hash;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('사용자 업데이트 오류:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapSupabaseUserToUser(data as SupabaseUser);
  } catch (error) {
    console.error('updateUser 오류:', error);
    return null;
  }
}
