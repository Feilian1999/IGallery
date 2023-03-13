using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebApplication1.Helpers;

namespace WebApplication1.Models;

public partial class DBContext : DbContext
{
    private readonly IOptions<DatabaseConnectionOptions> _connectOptions;
    public DBContext(IOptions<DatabaseConnectionOptions> connectOptions)
    {
        _connectOptions = connectOptions;
    }

    public DBContext(DbContextOptions<DBContext> options, IOptions<DatabaseConnectionOptions> connectOptions)
        : base(options)
    {
        _connectOptions = connectOptions;
    }

    public virtual DbSet<Artist> Artists { get; set; }

    public virtual DbSet<Token> Tokens { get; set; }

    // Change Here to switch Connection between Local and Azure
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer(_connectOptions.Value.AzureConnectionString);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Artist>(entity =>
        {
            entity.ToTable("Artist", tb => tb.HasComment("Artists in IGallery"));

            entity.Property(e => e.ArtistId).HasColumnName("artist_id");
            entity.Property(e => e.ArtistName)
                .HasMaxLength(50)
                .HasColumnName("artist_name");
        });

        modelBuilder.Entity<Token>(entity =>
        {
            entity.ToTable("Token");

            entity.Property(e => e.TokenId).HasColumnName("token_id");
            entity.Property(e => e.AccessToken).HasColumnName("access_token");
            entity.Property(e => e.ArtistId).HasColumnName("artist_id");
            entity.Property(e => e.CreateTime)
                .HasColumnType("datetime")
                .HasColumnName("create_time");
            entity.Property(e => e.ExpireTime)
                .HasColumnType("datetime")
                .HasColumnName("expire_time");
            entity.Property(e => e.UpdateTime)
                .HasColumnType("datetime")
                .HasColumnName("update_time");

            entity.HasOne(d => d.Artist).WithMany(p => p.Tokens)
                .HasForeignKey(d => d.ArtistId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("artist_id");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
