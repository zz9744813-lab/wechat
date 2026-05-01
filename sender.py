"""
邮件发送模块
使用 himalaya CLI 发送 HTML 邮件
"""

import os
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)


def send_html_email(
    html_path: str,
    subject: str,
    recipient: str = "1873298001@qq.com",
    sender: str = "1873298001@qq.com"
) -> bool:
    """
    通过 himalaya 发送 HTML 邮件
    
    Args:
        html_path: HTML 文件路径
        subject: 邮件主题
        recipient: 收件人
        sender: 发件人
    
    Returns:
        是否发送成功
    """
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    # 构造邮件内容（含 HTML 和纯文本备用）
    plain_text = _html_to_plain(html_content)
    
    # 写入临时文件发送
    email_content = f"""From: {sender}
To: {recipient}
Subject: {subject}
Content-Type: multipart/alternative; boundary="BOUNDARY"

--BOUNDARY
Content-Type: text/plain; charset=utf-8

{plain_text}

--BOUNDARY
Content-Type: text/html; charset=utf-8

{html_content}

--BOUNDARY--"""
    
    with tempfile.NamedTemporaryFile(mode="w", suffix=".eml", delete=False, encoding="utf-8") as f:
        f.write(email_content)
        tmp_path = f.name
    
    try:
        # 使用 himalaya 发送
        cmd = f'cat "{tmp_path}" | himalaya message send'
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            logger.info(f"邮件发送成功: {subject} -> {recipient}")
            return True
        else:
            logger.error(f"邮件发送失败: {result.stderr}")
            # 备用方案：直接用 himalaya 的简单方式
            return _send_simple(subject, html_content, recipient, sender)
    except Exception as e:
        logger.error(f"邮件发送异常: {e}")
        return _send_simple(subject, html_content, recipient, sender)
    finally:
        os.unlink(tmp_path)


def _send_simple(subject: str, body: str, recipient: str, sender: str) -> bool:
    """简单方式发送（备用）"""
    try:
        email_text = f"From: {sender}\nTo: {recipient}\nSubject: {subject}\nContent-Type: text/html; charset=utf-8\n\n{body}"
        result = subprocess.run(
            "himalaya message send",
            input=email_text,
            shell=True, capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            logger.info("备用方式发送成功")
            return True
        else:
            logger.error(f"备用方式也失败: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"备用方式异常: {e}")
        return False


def _html_to_plain(html: str) -> str:
    """简单将 HTML 转为纯文本（用于不支持 HTML 的邮件客户端）"""
    import re
    text = re.sub(r'<br\s*/?>', '\n', html)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'</h[1-6]>', '\n\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()
