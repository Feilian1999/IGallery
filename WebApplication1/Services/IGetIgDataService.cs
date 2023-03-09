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

        /// <summary>
        /// 取得相簿中所有貼文相關資料,包含Id, 內文, 圖片網址, Ig網址, 時間, 作者
        /// </summary>
        /// <returns> postId </returns>
        public Task<AlbumData> GetAlbumData(string albumId);

        /// <summary>
        /// 取得"單一"貼文資料，透過貼文id獲取
        /// </summary>
        /// <returns> ig data object</returns>
        public Task<IgData> GetIgPost(string postId);
    }

}

