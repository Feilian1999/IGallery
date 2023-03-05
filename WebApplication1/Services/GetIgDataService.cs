using System;
using WebApplication1.Models;
namespace WebApplication1.Services
{
	public class GetIgDataService : IGetIgDataService
	{
		public IgData GetIgData()
		{
			var igData = new IgData()
			{
				createrName = "feilian",
				ImageUrl = "image url"
			};

			return igData;
		}
	}
}
