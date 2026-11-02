using System;
using WebApplication1.Models;

	public interface IArtistService
	{
		/// <summary>
		/// add new artist, will check if artist exist or not first
		/// </summary>
		/// <param name="name"></param>
		/// <returns></returns>
		public int AddArtist(Artist artist);
		/// <summary>
		/// check if artist was in database
		/// </summary>
		/// <param name="name"></param>
		/// <param name="id"></param>
		/// <returns></returns>
		public bool CheckArtistExist(string? name);
	}


