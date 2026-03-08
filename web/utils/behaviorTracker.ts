/**
 * 用户行为追踪工具
 * 用于前端记录用户进入/离开功能的行为
 */

/**
 * 记录用户进入功能
 */
export async function trackEnter(functionName: string) {
  try {
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('email');

    if (!userId || !email) {
      console.warn('用户未登录，无法记录行为');
      return;
    }

    await fetch('/api/user-behavior/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        email: email,
        function_name: functionName,
        action: 'enter',
      }),
    });
  } catch (error) {
    console.error('记录进入行为失败:', error);
  }
}

/**
 * 记录用户离开功能
 */
export async function trackLeave(functionName: string) {
  try {
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('email');

    if (!userId || !email) {
      console.warn('用户未登录，无法记录行为');
      return;
    }

    await fetch('/api/user-behavior/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        email: email,
        function_name: functionName,
        action: 'leave',
      }),
    });
  } catch (error) {
    console.error('记录离开行为失败:', error);
  }
}
