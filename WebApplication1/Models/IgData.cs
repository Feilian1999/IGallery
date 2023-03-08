using System;
namespace WebApplication1.Models
{
	public class IgData
	{
		//public int? id { get; set; }
		//public string? caption { get; set; }
		//public string? media_type { get; set; }
		//public string? media_url { get; set; }
		//public string? permalink {get; set; }
		//public string? timestamp { get; set; }
		//public string? username { get; set; }

		public Data[]? data {  get; set; }
		public Paging? paging { get; set; }
    }

	public class Data
	{
		public string? id { get; set; }
		public string? caption { get; set; }
	}

	public class Paging
	{
		public Cursors? cursors { get; set; }
	}

	public class Cursors
	{
		public string? after { get; set; }
		public string? before { get; set; }
	}
}

