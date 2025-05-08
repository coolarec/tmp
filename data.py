import sqlite3
from datetime import datetime
import random
import time
from threading import Thread, Event

class EEGDataRecorder:
    def __init__(self, db_file="eeg_data.db"):
        self.db_file = db_file
        self.stop_event = Event()
        self.conn = None
        
    def create_connection(self):
        """创建数据库连接"""
        try:
            self.conn = sqlite3.connect(self.db_file)
            print(f"✅ 成功连接到数据库: {self.db_file}")
            self.initialize_database()
        except sqlite3.Error as e:
            print(f"❌ 连接数据库时出错: {e}")
            raise

    def initialize_database(self):
        """初始化EEG数据表结构"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS eeg_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    theta_pow REAL NOT NULL,
                    low_alpha REAL NOT NULL,
                    high_alpha REAL NOT NULL,
                    low_beta REAL NOT NULL,
                    autism_prob REAL NOT NULL,
                    normal_prob REAL NOT NULL,
                    mse_loss REAL NOT NULL,
                    CHECK (ROUND(autism_prob + normal_prob, 2) = 1.00)
                )
            ''')
            self.conn.commit()
            print("✅ 数据库表结构已就绪")
        except sqlite3.Error as e:
            print(f"❌ 初始化数据库时出错: {e}")
            raise

    def generate_eeg_metrics(self):
        """生成模拟EEG指标数据"""
        # 生成各频段功率值 (μV²)
        metrics = (
            round(random.uniform(10, 50), 2),    # theta
            round(random.uniform(5, 30), 2),     # low_alpha
            round(random.uniform(3, 25), 2),     # high_alpha
            round(random.uniform(2, 20), 2),     # low_beta
            round(random.uniform(0.7, 0.99), 4), # autism_prob
            round(random.uniform(0.01, 0.3), 4), # normal_prob
            round(random.uniform(0.01, 0.15), 6) # mse_loss
        )
        # 调整概率总和为1
        metrics = list(metrics)
        metrics[5] = round(1 - metrics[4], 4)  # normal_prob = 1 - autism_prob
        return tuple(metrics)

    def save_eeg_record(self, metrics):
        """保存EEG记录到数据库"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT INTO eeg_data (
                    timestamp, theta_pow, low_alpha, high_alpha, low_beta, 
                    autism_prob, normal_prob, mse_loss
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (datetime.now(), *metrics))
            self.conn.commit()
            print(f"💾 记录已保存 (ID: {cursor.lastrowid})", end='\r')
        except sqlite3.Error as e:
            print(f"❌ 保存数据时出错: {e}")

    def start_recording(self, interval=1.0):
        """开始定时记录数据"""
        self.create_connection()
        print(f"\n⏱ 开始EEG数据记录 (间隔: {interval}秒)")
        print("按Ctrl+C停止记录\n")
        
        try:
            while not self.stop_event.is_set():
                start_time = time.time()
                
                # 生成并保存数据
                metrics = self.generate_eeg_metrics()
                self.save_eeg_record(metrics)
                
                # 计算剩余等待时间
                elapsed = time.time() - start_time
                remaining = max(0, interval - elapsed)
                time.sleep(remaining)
                
        except KeyboardInterrupt:
            print("\n🛑 用户中断记录过程")
        finally:
            self.conn.close()
            print("✅ 数据库连接已关闭")

    def stop_recording(self):
        """停止记录"""
        self.stop_event.set()

def main():
    recorder = EEGDataRecorder('.output/eeg_data.db')
    
    # 在后台线程中运行记录器
    recording_thread = Thread(target=recorder.start_recording, kwargs={'interval': 1.0})
    recording_thread.daemon = True
    recording_thread.start()
    
    try:
        while recording_thread.is_alive():
            time.sleep(0.1)
    except KeyboardInterrupt:
        recorder.stop_recording()
        recording_thread.join()
    
    print("\n🎉 数据记录会话结束")

if __name__ == '__main__':
    main()