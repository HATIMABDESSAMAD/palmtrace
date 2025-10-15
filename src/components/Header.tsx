import palmLogo from '@/assets/palm-logo.svg';

const Header = () => {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-15 h-15 rounded-lg bg-white">
            <img src={palmLogo} alt="PalmTrace Logo" className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">PalmTrace</h1>
            <p className="text-xs text-muted-foreground">Les Domaines Agricoles - Errachidia</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
