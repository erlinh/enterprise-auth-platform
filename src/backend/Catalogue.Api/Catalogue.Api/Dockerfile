FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Catalogue.Api/Catalogue.Api.csproj", "Catalogue.Api/"]
COPY ["../Shared/Platform.Shared/Platform.Shared.csproj", "../Shared/Platform.Shared/"]
RUN dotnet restore "Catalogue.Api/Catalogue.Api.csproj"
COPY . .
WORKDIR "/src/Catalogue.Api"
RUN dotnet build "Catalogue.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Catalogue.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_URLS=http://+:5001
ENTRYPOINT ["dotnet", "Catalogue.Api.dll"]

