#!/bin/bash
# Setup script for zsh with Powerlevel10k theme in WSL

echo "Setting up zsh with Powerlevel10k theme..."

# Update package list
sudo apt update

# Install zsh if not already installed
if ! command -v zsh &> /dev/null; then
    echo "Installing zsh..."
    sudo apt install -y zsh
else
    echo "zsh is already installed"
fi

# Install git if not already installed (needed for oh-my-zsh)
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo apt install -y git
fi

# Install oh-my-zsh if not already installed
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    echo "Installing oh-my-zsh..."
   sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmy zsh/ohmyzsh/master/tools/install.sh)" "" --unattended
else
    echo "oh-my-zsh is already installed"
fi

# Install Powerlevel10k theme
if [ ! -d "$HOME/.oh-my-zsh/custom/themes/powerlevel10k" ]; then
    echo "Installing Powerlevel10k theme..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
else
    echo "Powerlevel10k theme is already installed"
fi

# Configure .zshrc
echo "Configuring .zshrc..."
if [ -f "$HOME/.zshrc" ]; then
    # Backup existing .zshrc
    cp "$HOME/.zshrc" "$HOME/.zshrc.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Set Powerlevel10k as the theme
sed -i 's/^ZSH_THEME=.*/ZSH_THEME="powerlevel10k\/powerlevel10k"/' "$HOME/.zshrc" 2>/dev/null || echo 'ZSH_THEME="powerlevel10k/powerlevel10k"' >> "$HOME/.zshrc"

# Set zsh as default shell
if [ "$SHELL" != "$(which zsh)" ]; then
    echo "Setting zsh as default shell..."
    chsh -s $(which zsh)
    echo "Please restart your terminal or run 'zsh' to start using zsh"
else
    echo "zsh is already your default shell"
fi

echo ""
echo "Setup complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Restart your terminal or run 'zsh'"
echo "2. Run 'p10k configure' to customize your Powerlevel10k theme"
echo "3. If you need to install fonts for better icon support, run:"
echo "   wget https://github.com/romkatv/powerlevel10k-media/raw/master/MesloLGS%20NF%20Regular.ttf"
echo "   (Then install the font in Windows)"
echo ""
