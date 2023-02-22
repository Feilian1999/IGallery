using System;
using WebApplication1.Models;

namespace WebApplication1.Services
{
	public interface IGetIgDataService
	{
        /// <summary>
        /// 取得ig data
        /// </summary>
        /// <returns> ig data object</returns>
        IgData GetIgData();
    }
}

