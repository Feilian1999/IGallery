using System;
using WebApplication1.Models;

namespace WebApplication1.Services
{
	public interface IGetIgDataService
	{
        /// <summary>
        /// 取得貼文相關資料,包含Id, 內文, 圖片網址, Ig網址, 時間, 作者
        /// </summary>
        /// <returns> ig data object</returns>
        public Task<IgData> GetIgData();
    }

}

