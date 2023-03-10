using System.ComponentModel.DataAnnotations;
namespace WebApplication1.Models
{
    public class AlbumData
    {

        public AlbumId[]? data { get; set; }
    }

    public class AlbumId
    {
        public string? id { get; set; }

    }

    public class PostInAlbum
    {
        public string? id { get; set; }
        public string? media_type { get; set; }
        public string? media_url { get; set; }
        public string? permalink { get; set; }
        public string? timestamp { get; set; }
        public string? username { get; set; }
    }
}
