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
        public Task<IgData> GetIgData(string token);

        /// <summary>
        /// 取得相簿中所有貼文Id
        /// </summary>
        /// <returns> album Id array </returns>
        public Task<AlbumData> GetAlbumData(string albumId, string token);

        /// <summary>
        /// 取得"單一"相簿資料，透過貼文id獲取
        /// </summary>
        /// <returns> data object</returns>
        public Task<PostInAlbum> GetAlbumPost(string postId, string token);
        /// <summary>
        /// 取得Ig創作者資訊
        /// </summary>
        /// <returns> data object</returns>
        public Task<ArtistInfo> GetArtistInfo(string userID, string token);
    }

}

