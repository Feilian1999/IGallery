using System;
using WebApplication1.Models;

namespace WebApplication1.Services
{
	public class ArtistService:IArtistService
	{
		private readonly DBContext _db;
		public ArtistService(DBContext db)
		{
			_db = db;
		}

		public int AddArtist(Artist artist)
		{
			var isExist = CheckArtistExist(name: artist.ArtistName);
			var result = 0;
			if (!isExist)
			{
                _db.Artists.Add(artist);
                result = _db.SaveChanges();
            }
            return result;
        }


		public bool CheckArtistExist(string? name)
		{
			var isExist = _db.Artists.Any(artist => artist.ArtistName == name);
			
			return isExist;
        }
	}
}

