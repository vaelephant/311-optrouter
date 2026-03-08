/**
 * 统计相关工具函数
 */

/**
 * 从 User-Agent 解析设备类型
 */
export function parseDeviceType(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown';
  
  const uaLower = userAgent.toLowerCase();
  
  // 桌面设备检测
  const desktopKeywords = ['windows', 'macintosh', 'linux', 'x11'];
  if (desktopKeywords.some(kw => uaLower.includes(kw))) {
    // 排除移动设备伪装成桌面
    if (!uaLower.includes('mobile') && !uaLower.includes('android')) {
      return 'Desktop';
    }
  }
  
  // 平板设备检测
  const tabletKeywords = ['ipad', 'tablet', 'playbook'];
  if (tabletKeywords.some(kw => uaLower.includes(kw))) {
    return 'Tablet';
  }
  
  // 移动设备检测
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'opera mini', 'windows phone'];
  if (mobileKeywords.some(kw => uaLower.includes(kw))) {
    return 'Mobile';
  }
  
  return 'Unknown';
}

/**
 * 从 IP 地址解析地理位置（使用免费的 ip-api.com API）
 * 注意：此功能需要调用外部 API，可根据需要启用或禁用
 */
export async function parseLocationFromIp(ipAddress: string | null | undefined): Promise<string | null> {
  if (
    !ipAddress ||
    ipAddress === '未知' ||
    ipAddress === 'localhost' ||
    ipAddress === '127.0.0.1' ||
    ipAddress === '::1'
  ) {
    return null;
  }

  // 跳过常见的内网 / 保留地址，避免向外部接口发起无意义请求
  const normalizedIp = ipAddress.trim().toLowerCase();
  if (
    normalizedIp.startsWith('10.') ||
    normalizedIp.startsWith('192.168.') ||
    normalizedIp.startsWith('172.') && (() => {
      const second = Number(normalizedIp.split('.')[1]);
      return second >= 16 && second <= 31;
    })() ||
    normalizedIp.startsWith('100.64.') ||
    normalizedIp.startsWith('169.254.') ||
    normalizedIp.startsWith('fe80:') ||
    normalizedIp.startsWith('fc00:') ||
    normalizedIp.startsWith('fd00:')
  ) {
    return null;
  }

  try {
    // 使用免费的 ip-api.com API（无需 API Key）
    // 限制：每分钟45次请求，http访问（非https）
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?lang=zh-CN&fields=status,country,regionName,city`,
      {
        signal: AbortSignal.timeout(3000), // 3秒超时
      }
    );
    const data = await response.json();

    if (data.status === 'success') {
      const parts = [];
      if (data.city) parts.push(data.city);
      if (data.regionName) parts.push(data.regionName);
      if (data.country) parts.push(data.country);
      return parts.join(', ') || null;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('IP 地理位置解析失败:', error);
    }
  }
  
  return null;
}

/**
 * 计算会话时长（从登录时间到当前时间或下一次登录时间）
 */
export async function calculateSessionDuration(
  loginAt: Date,
  userId: string,
  prisma: any
): Promise<number | null> {
  try {
    const loginTime = loginAt;
    
    // 查找该用户在这次登录之后的下一次登录时间
    const nextLogin = await prisma.userLoginLog.findFirst({
      where: {
        userId: userId,
        loginAt: {
          gt: loginAt,
        },
      },
      orderBy: {
        loginAt: 'asc',
      },
    });
    
    if (nextLogin) {
      // 如果有下一次登录，用下一次登录时间减去当前登录时间
      const nextLoginTime = nextLogin.loginAt;
      const durationMinutes = (nextLoginTime.getTime() - loginTime.getTime()) / (1000 * 60);
      return durationMinutes;
    } else {
      // 如果没有下一次登录，查找该用户最后一次行为记录的时间
      const lastBehavior = await prisma.userBehaviorLog.findFirst({
        where: {
          userId: userId,
        },
        orderBy: {
          startTime: 'desc',
        },
      });
      
      if (lastBehavior && lastBehavior.endTime) {
        const endTime = lastBehavior.endTime;
        const durationMinutes = (endTime.getTime() - loginTime.getTime()) / (1000 * 60);
        if (durationMinutes > 0) {
          return durationMinutes;
        }
      }
      
      // 如果都没有，返回当前时间到登录时间的差值
      const now = new Date();
      const durationMinutes = (now.getTime() - loginTime.getTime()) / (1000 * 60);
      return durationMinutes > 0 ? durationMinutes : null;
    }
  } catch (error) {
    console.error('计算会话时长失败:', error);
    return null;
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
